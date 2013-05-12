
function iScroll (el, options) {
	this.wrapper = typeof el == 'string' ? document.querySelector(el) : el;
	this.scroller = this.wrapper.children[0];
	this.scrollerStyle = this.scroller.style;		// cache style for better performance

	this.options = {
		startX: 0,
		startY: 0,
		scrollX: false,
		scrollY: true,
		lockDirection: true,
		momentum: true,

		bounce: true,
		bounceTime: 600,
		bounceEasing: 'circular',

		preventDefault: true,
		eventPassthrough: false,

		HWCompositing: true,
		useTransition: true,
		useTransform: true,

		mouseWheel: false,
		invertWheelDirection: false,

		keyBindings: false,

		scrollbars: false,
		interactiveScrollbars: false,
		resizeIndicator: true,

		snap: false,
		snapThreshold: 10,

		zoomMin: 1,
		zoomMax: 4
	};

	for ( var i in options ) {
		this.options[i] = options[i];
	}

	// Normalize options
	this.translateZ = this.options.HWCompositing && utils.hasPerspective ? ' translateZ(0)' : '';

	this.options.useTransition = utils.hasTransition && this.options.useTransition;
	this.options.useTransform = utils.hasTransform && this.options.useTransform;
	this.options.invertWheelDirection = this.options.invertWheelDirection ? -1 : 1;

	this.options.eventPassthrough = this.options.eventPassthrough === true ? 'vertical' : this.options.eventPassthrough;
	this.options.preventDefault = !this.options.eventPassthrough && this.options.preventDefault;

	// If you want eventPassthrough I have to lock one of the axes
	this.options.scrollY = this.options.eventPassthrough == 'vertical' ? false : this.options.scrollY;
	this.options.scrollX = this.options.eventPassthrough == 'horizontal' ? false : this.options.scrollX;

	// With eventPassthrough we also need lockDirection mechanism
	this.options.lockDirection = this.options.lockDirection || this.options.eventPassthrough;
	this.directionLockThreshold = this.options.eventPassthrough ? 0 : 5;

	this.options.bounceEasing = typeof this.options.bounceEasing == 'string' ? utils.ease[this.options.bounceEasing] || utils.ease.circular : this.options.bounceEasing;

	// Some defaults	
	this.x = 0;
	this.y = 0;
	this._events = {};
	this.scale = 1;

	this._init();
	this.refresh();

	this.scrollTo(this.options.startX, this.options.startY);
	this.enable();
}

iScroll.prototype.destroy = function () {
	this._initEvents(true);

	this._execCustomEvent('destroy');
};

iScroll.prototype._transitionEnd = function (e) {
	if ( e.target != this.scroller ) {
		return;
	}

	this._transitionTime(0);
	this.resetPosition(this.options.bounceTime);
};

iScroll.prototype._start = function (e) {
	if ( !this.enabled || (this.initiated && utils.eventType[e.type] !== this.initiated) ) {
		return;
	}

	if ( this.options.preventDefault ) {
		e.preventDefault();
	}

	var point = e.touches ? e.touches[0] : e,
		pos;

	this.initiated	= utils.eventType[e.type];
	this.moved		= false;
	this.distX		= 0;
	this.distY		= 0;
	this.directionX = 0;
	this.directionY = 0;
	this.directionLocked = 0;

	this._transitionTime();
	
	this.isAnimating = false;
	this.startTime = utils.getTime();

	if ( this.options.useTransition && this.isInTransition ) {
		pos = this.getComputedPosition();

		this._translate(Math.round(pos.x), Math.round(pos.y));
		this.isInTransition = false;
	}

	this.startX = this.x;
	this.startY = this.y;
	this.absStartX = this.x;
	this.absStartY = this.y;
	this.pointX = point.pageX;
	this.pointY = point.pageY;
};

iScroll.prototype._move = function (e) {
	if ( !this.enabled || utils.eventType[e.type] !== this.initiated ) {
		return;
	}

	if ( this.options.preventDefault ) {	// increases performance on Android? TODO: check!
		e.preventDefault();
	}

	var point		= e.touches ? e.touches[0] : e,
		deltaX		= point.pageX - this.pointX,
		deltaY		= point.pageY - this.pointY,
		timestamp	= utils.getTime(),
		newX, newY,
		absDistX, absDistY;

	this.pointX		= point.pageX;
	this.pointY		= point.pageY;

	this.distX		+= deltaX;
	this.distY		+= deltaY;
	absDistX		= Math.abs(this.distX);
	absDistY		= Math.abs(this.distY);

	// We need to move at least 10 pixels for the scrolling to initiate
	if ( timestamp - this.endTime > 300 && (absDistX < 10 && absDistY < 10) ) {
		return;
	}

	// If you are scrolling in one direction lock the other
	if ( !this.directionLocked && this.options.lockDirection ) {
		if ( absDistX > absDistY + this.directionLockThreshold ) {
			this.directionLocked = 'h';		// lock horizontally
		} else if ( absDistY >= absDistX + this.directionLockThreshold ) {
			this.directionLocked = 'v';		// lock vertically
		} else {
			this.directionLocked = 'n';		// no lock
		}
	}

	if ( this.directionLocked == 'h' ) {
		if ( this.options.eventPassthrough == 'vertical' ) {
			e.preventDefault();
		} else if ( this.options.eventPassthrough == 'horizontal' ) {
			this.initiated = false;
			return;
		}

		deltaY = 0;
	} else if ( this.directionLocked == 'v' ) {
		if ( this.options.eventPassthrough == 'horizontal' ) {
			e.preventDefault();
		} else if ( this.options.eventPassthrough == 'vertical' ) {
			this.initiated = false;
			return;
		}

		deltaX = 0;
	}

	newX = this.x + (this.hasHorizontalScroll ? deltaX : 0);
	newY = this.y + (this.hasVerticalScroll ? deltaY : 0);

	// Slow down if outside of the boundaries
	if ( newX > 0 || newX < this.maxScrollX ) {
		newX = this.options.bounce ? this.x + deltaX / 3 : newX > 0 ? 0 : this.maxScrollX;
	}
	if ( newY > 0 || newY < this.maxScrollY ) {
		newY = this.options.bounce ? this.y + deltaY / 3 : newY > 0 ? 0 : this.maxScrollY;
	}

	this.directionX = deltaX > 0 ? -1 : deltaX < 0 ? 1 : 0;
	this.directionY = deltaY > 0 ? -1 : deltaY < 0 ? 1 : 0;

	this.moved = true;

	if ( timestamp - this.startTime > 300 ) {
		this.startTime = timestamp;
		this.startX = this.x;
		this.startY = this.y;
	}

	this._translate(newX, newY);
};

iScroll.prototype._end = function (e) {
	if ( !this.enabled || utils.eventType[e.type] !== this.initiated ) {
		return;
	}

	if ( this.options.preventDefault ) {
		e.preventDefault();
	}

	var point = e.changedTouches ? e.changedTouches[0] : e,
		momentumX,
		momentumY,
		duration = utils.getTime() - this.startTime,
		newX = Math.round(this.x),
		newY = Math.round(this.y),
		time = 0,
		easing = '';

	this.isInTransition = 0;
	this.initiated = 0;
	this.endTime = utils.getTime();

	// reset if we are outside of the boundaries
	if ( this.resetPosition(this.options.bounceTime) ) {
		return;
	}

	// we scrolled less than 10 pixels
	if ( !this.moved ) {
		return;
	}

	// start momentum animation if needed
	if ( this.options.momentum && duration < 300 ) {
		momentumX = this.hasHorizontalScroll ? utils.momentum(this.x, this.startX, duration, this.maxScrollX, this.options.bounce ? this.wrapperWidth : 0) : { destination: newX, duration: 0 };
		momentumY = this.hasVerticalScroll ? utils.momentum(this.y, this.startY, duration, this.maxScrollY, this.options.bounce ? this.wrapperHeight : 0) : { destination: newY, duration: 0 };
		newX = momentumX.destination;
		newY = momentumY.destination;
		time = Math.max(momentumX.duration, momentumY.duration);
		this.isInTransition = 1;
	}

	if ( this.options.snap ) {
		var snap = this._nearestSnap(newX, newY);
		this.currentPage = snap;
		newX = snap.x;
		newY = snap.y;
		time = this.options.snapSpeed || Math.max(
			Math.max(
				Math.min(Math.abs(newX - this.x), 1000),
				Math.min(Math.abs(newY - this.y), 1000)
			),
		300);

		easing = this.options.bounceEasing;
	}

	if ( newX != this.x || newY != this.y ) {
		// change easing function when scroller goes out of the boundaries
		if ( newX > 0 || newX < this.maxScrollX || newY > 0 || newY < this.maxScrollY ) {
			easing = utils.ease.quadratic;
		}

		this.scrollTo(newX, newY, time, easing);
		return;
	}

	this._execCustomEvent('scrollEnd');
};

iScroll.prototype._animate = function (destX, destY, duration, easingFn) {
	var that = this,
		startX = this.x,
		startY = this.y,
		startTime = utils.getTime(),
		destTime = startTime + duration;

	function step () {
		var now = utils.getTime(),
			newX, newY,
			easing;

		if ( now >= destTime ) {
			that.isAnimating = false;
			that._translate(destX, destY);
			that.resetPosition(that.options.bounceTime);
			return;
		}

		now = ( now - startTime ) / duration;
		easing = easingFn(now);
		newX = ( destX - startX ) * easing + startX;
		newY = ( destY - startY ) * easing + startY;
		that._translate(newX, newY);

		if ( that.isAnimating ) {
			rAF(step);
		}
	}

	this.isAnimating = true;
	step();
};

iScroll.prototype._resize = function () {
	var that = this;

	clearTimeout(this.resizeTimeout);

	this.resizeTimeout = setTimeout(function () {
		that.refresh();
		that.resetPosition();
	}, 60);
};

iScroll.prototype.resetPosition = function (time) {
	if ( this.x <= 0 && this.x >= this.maxScrollX && this.y <= 0 && this.y >= this.maxScrollY ) {
		return false;
	}

	var x = this.x,
		y = this.y;

	time = time || 0;

	if ( !this.hasHorizontalScroll || this.x > 0 ) {
		x = 0;
	} else if ( this.x < this.maxScrollX ) {
		x = this.maxScrollX;
	}

	if ( !this.hasVerticalScroll || this.y > 0 ) {
		y = 0;
	} else if ( this.y < this.maxScrollY ) {
		y = this.maxScrollY;
	}

	this.scrollTo(x, y, time, this.options.bounceEasing);

	return true;
};

iScroll.prototype.disable = function () {
	this.enabled = false;
};

iScroll.prototype.enable = function () {
	this.enabled = true;
};

iScroll.prototype.refresh = function () {
	var rf = this.wrapper.offsetHeight;		// Force refresh

	this.wrapperWidth	= this.wrapper.clientWidth;
	this.wrapperHeight	= this.wrapper.clientHeight;

	this.scrollerWidth	= Math.round(this.scroller.offsetWidth * this.scale);
	this.scrollerHeight	= Math.round(this.scroller.offsetHeight * this.scale);

	this.maxScrollX		= this.wrapperWidth - this.scrollerWidth;
	this.maxScrollY		= this.wrapperHeight - this.scrollerHeight;

	if ( this.maxScrollX > 0 ) {
		this.maxScrollX = 0;
	}

	if ( this.maxScrollY > 0 ) {
		this.maxScrollY = 0;
	}

	this.hasHorizontalScroll	= this.options.scrollX && this.maxScrollX < 0;
	this.hasVerticalScroll		= this.options.scrollY && this.maxScrollY < 0;

	this.endTime		= 0;

	this._execCustomEvent('refresh');
};

iScroll.prototype.on = function (type, fn) {
	if ( !this._events[type] ) {
		this._events[type] = [];
	}

	this._events[type].push(fn);
};

iScroll.prototype._execCustomEvent = function (type) {
	if ( !this._events[type] ) {
		return;
	}

	var i = 0,
		l = this._events[type].length;

	if ( !l ) {
		return;
	}

	for ( ; i < l; i++ ) {
		this._events[type][i].call(this);
	}
};

iScroll.prototype.scrollBy = function (x, y, time, easing) {
	x = this.x + x;
	y = this.y + y;
	time = time || 0;

	this.scrollTo(x, y, time, easing);
};

iScroll.prototype.scrollTo = function (x, y, time, easing) {
	easing = easing || utils.ease.circular;

	if ( !time || (this.options.useTransition && easing.style) ) {
		this._transitionTimingFunction(easing.style);
		this._transitionTime(time);
		this._translate(x, y);
	} else {
		this._animate(x, y, time, easing.fn);
	}
};

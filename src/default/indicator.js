
function createDefaultScrollbar (direction, interactive, type) {
	var scrollbar = document.createElement('div'),
		indicator = document.createElement('div');

	if ( type === true ) {
		scrollbar.style.cssText = 'position:absolute;z-index:9999';
		indicator.style.cssText = '-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;position:absolute;background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.9);border-radius:3px';
	}

	indicator.className = 'iScrollIndicator';

	if ( direction == 'h' ) {
		if ( type === true ) {
			scrollbar.style.cssText += ';height:7px;left:2px;right:2px;bottom:0';
			indicator.style.height = '100%';
		}
		scrollbar.className = 'iScrollHorizontalScrollbar';
	} else {
		if ( type === true ) {
			scrollbar.style.cssText += ';width:7px;bottom:2px;top:2px;right:1px';
			indicator.style.width = '100%';
		}
		scrollbar.className = 'iScrollVerticalScrollbar';
	}

	if ( !interactive ) {
		scrollbar.style.pointerEvents = 'none';
	}

	scrollbar.appendChild(indicator);

	return scrollbar;
}

iScroll.prototype._initIndicators = function () {
	var interactive = this.options.interactiveScrollbars,
		defaultScrollbars = typeof this.options.scrollbars != 'object',
		indicator1,
		indicator2;

	if ( this.options.scrollbars ) {
		// Vertical scrollbar
		if ( this.options.scrollY ) {
			indicator1 = {
				el: createDefaultScrollbar('v', interactive, this.options.scrollbars),
				interactive: interactive,
				defaultScrollbars: true,
				resize: this.options.resizeIndicator,
				listenX: false
			};

			this.wrapper.appendChild(indicator1.el);
		}

		// Horizontal scrollbar
		if ( this.options.scrollX ) {
			indicator2 = {
				el: createDefaultScrollbar('h', interactive, this.options.scrollbars),
				interactive: interactive,
				defaultScrollbars: true,
				resize: this.options.resizeIndicator,
				listenY: false
			};

			this.wrapper.appendChild(indicator2.el);
		}
	} else {
		indicator1 = this.options.indicators.length ? this.options.indicators[0] : this.options.indicators;
		indicator2 = this.options.indicators[1] && this.options.indicators[1];
	}

	if ( indicator1 ) {
		this.indicator1 = new Indicator(this, indicator1);
	}

	if ( indicator2 ) {
		this.indicator2 = new Indicator(this, indicator2);
	}

	this.on('refresh', function () {
		if ( this.indicator1 ) {
			this.indicator1.refresh();
		}

		if ( this.indicator2 ) {
			this.indicator2.refresh();
		}
	});

	this.on('destroy', function () {
		if ( this.indicator1 ) {
			this.indicator1._destroy();
		}

		if ( this.indicator2 ) {
			this.indicator2._destroy();
		}
	});
};

function Indicator (scroller, options) {
	this.wrapper = typeof options.el == 'string' ? document.querySelector(options.el) : options.el;
	this.indicator = this.wrapper.children[0];
	this.indicatorStyle = this.indicator.style;
	this.scroller = scroller;

	this.options = {
		listenX: true,
		listenY: true,
		interactive: false,
		resize: true,
		defaultScrollbars: false,
		speedRatioX: 0,
		speedRatioY: 0
	};

	for ( var i in options ) {
		this.options[i] = options[i];
	}

	if ( this.options.interactive ) {
		utils.addEvent(this.indicator, 'touchstart', this);
		utils.addEvent(this.indicator, 'MSPointerDown', this);
		utils.addEvent(this.indicator, 'mousedown', this);

		utils.addEvent(window, 'touchend', this);
		utils.addEvent(window, 'MSPointerMove', this);
		utils.addEvent(window, 'mouseup', this);
	}
}

Indicator.prototype.handleEvent = function (e) {
	switch ( e.type ) {
		case 'touchstart':
		case 'MSPointerDown':
		case 'mousedown':
			this._start(e);
			break;
		case 'touchmove':
		case 'MSPointerMove':
		case 'mousemove':
			this._move(e);
			break;
		case 'touchend':
		case 'MSPointerUp':
		case 'mouseup':
			this._end(e);
			break;
		case 'touchcancel':
		case 'MSPointerCancel':
		case 'mousecancel':
			this._end(e);
			break;
	}
};

Indicator.prototype._destroy = function () {
	if ( this.options.interactive ) {
		utils.removeEvent(this.indicator, 'touchstart', this);
		utils.removeEvent(this.indicator, 'MSPointerDown', this);
		utils.removeEvent(this.indicator, 'mousedown', this);

		utils.removeEvent(window, 'touchmove', this);
		utils.removeEvent(window, 'MSPointerMove', this);
		utils.removeEvent(window, 'mousemove', this);

		utils.removeEvent(window, 'touchend', this);
		utils.removeEvent(window, 'MSPointerMove', this);
		utils.removeEvent(window, 'mouseup', this);
	}
};

Indicator.prototype._start = function (e) {
	var point = e.touches ? e.touches[0] : e;

	e.preventDefault();
	e.stopPropagation();

	this.transitionTime(0);

	this.lastPointX	= point.pageX;
	this.lastPointY	= point.pageY;

	this.startTime	= utils.getTime();

	utils.addEvent(window, 'touchmove', this);
	utils.addEvent(window, 'MSPointerMove', this);
	utils.addEvent(window, 'mousemove', this);
};

Indicator.prototype._move = function (e) {
	var point = e.touches ? e.touches[0] : e,
		deltaX, deltaY,
		newX, newY,
		timestamp = utils.getTime();

	deltaX = point.pageX - this.lastPointX;
	this.lastPointX = point.pageX;

	deltaY = point.pageY - this.lastPointY;
	this.lastPointY = point.pageY;

	newX = this.x + deltaX;
	newY = this.y + deltaY;

	this._pos(newX, newY);

	e.preventDefault();
	e.stopPropagation();
};

Indicator.prototype._end = function (e) {
	e.preventDefault();
	e.stopPropagation();

	utils.removeEvent(window, 'touchmove', this);
	utils.removeEvent(window, 'MSPointerMove', this);
	utils.removeEvent(window, 'mousemove', this);
};

Indicator.prototype.transitionTime = function (time) {
	time = time || 0;
	this.indicatorStyle[utils.style.transitionDuration] = time + 'ms';
};

Indicator.prototype.transitionTimingFunction = function (easing) {
	this.indicatorStyle[utils.style.transitionTimingFunction] = easing;
};

Indicator.prototype.refresh = function () {
	this.transitionTime(0);

	if ( this.options.listenX && !this.options.listenY ) {
		this.indicatorStyle.display = this.scroller.hasHorizontalScroll ? 'block' : 'none';
	} else if ( this.options.listenY && !this.options.listenX ) {
		this.indicatorStyle.display = this.scroller.hasVerticalScroll ? 'block' : 'none';
	} else {
		this.indicatorStyle.display = this.scroller.hasHorizontalScroll || this.scroller.hasVerticalScroll ? 'block' : 'none';
	}

	if ( this.scroller.hasHorizontalScroll && this.scroller.hasVerticalScroll ) {
		utils.addClass(this.wrapper, 'iScrollBothScrollbars');
		utils.removeClass(this.wrapper, 'iScrollLoneScrollbar');

		if ( this.options.defaultScrollbars ) {
			if ( this.options.listenX ) {
				this.wrapper.style.right = '8px';
			} else {
				this.wrapper.style.bottom = '8px';
			}
		}
	} else {
		utils.removeClass(this.wrapper, 'iScrollBothScrollbars');
		utils.addClass(this.wrapper, 'iScrollLoneScrollbar');

		if ( this.options.defaultScrollbars ) {
			if ( this.options.listenX ) {
				this.wrapper.style.right = '2px';
			} else {
				this.wrapper.style.bottom = '2px';
			}
		}
	}

	var r = this.wrapper.offsetHeight;	// force refresh

	if ( this.options.listenX ) {
		this.wrapperWidth = this.wrapper.clientWidth;
		if ( this.options.resize ) {
			this.indicatorWidth = Math.max(Math.round(this.wrapperWidth * this.wrapperWidth / this.scroller.scrollerWidth), 8);
			this.indicatorStyle.width = this.indicatorWidth + 'px';
		} else {
			this.indicatorWidth = this.indicator.clientWidth;
		}
		this.maxPosX = this.wrapperWidth - this.indicatorWidth;
		this.sizeRatioX = this.options.speedRatioX || (this.scroller.maxScrollX && (this.maxPosX / this.scroller.maxScrollX));	
	}

	if ( this.options.listenY ) {
		this.wrapperHeight = this.wrapper.clientHeight;
		if ( this.options.resize ) {
			this.indicatorHeight = Math.max(Math.round(this.wrapperHeight * this.wrapperHeight / this.scroller.scrollerHeight), 8);
			this.indicatorStyle.height = this.indicatorHeight + 'px';
		} else {
			this.indicatorHeight = this.indicator.clientHeight;
		}

		this.maxPosY = this.wrapperHeight - this.indicatorHeight;
		this.sizeRatioY = this.options.speedRatioY || (this.scroller.maxScrollY && (this.maxPosY / this.scroller.maxScrollY));
	}

	this.updatePosition();
};

Indicator.prototype.updatePosition = function () {
	var x = Math.round(this.sizeRatioX * this.scroller.x) || 0,
		y = Math.round(this.sizeRatioY * this.scroller.y) || 0;

	if ( !this.options.ignoreBoundaries ) {
		if ( x < 0 ) {
			x = 0;
		} else if ( x > this.maxPosX ) {
			x = this.maxPosX;
		}

		if ( y < 0 ) {
			y = 0;
		} else if ( y > this.maxPosY ) {
			y = this.maxPosY;
		}		
	}

	this.x = x;
	this.y = y;

	if ( this.scroller.options.useTransform ) {
		this.indicatorStyle[utils.style.transform] = 'translate(' + x + 'px,' + y + 'px)' + this.scroller.translateZ;
	} else {
		this.indicatorStyle.left = x + 'px';
		this.indicatorStyle.top = y + 'px';
	}
};

Indicator.prototype._pos = function (x, y) {
	if ( x < 0 ) {
		x = 0;
	} else if ( x > this.maxPosX ) {
		x = this.maxPosX;
	}

	if ( y < 0 ) {
		y = 0;
	} else if ( y > this.maxPosY ) {
		y = this.maxPosY;
	}

	this.scroller.scrollTo(Math.round(x / this.sizeRatioX), Math.round(y / this.sizeRatioY));
};

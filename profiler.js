/**
 * Timing - Presents visually the timing of different
 * page loading phases by a browser. (https://github.com/kaaes/timing)
 * Copyright (c) 2011-2013, Kasia Drzyzga. (FreeBSD License)
 *
 * Simple version without variation
 */
function __Profiler() {
  this.totalTime = 0;

  this.timingData = [];
  this.sections = [];
};

/**
 * The order of the events is important,
 * store it here.
 */
__Profiler.prototype.eventsOrder = [
  'navigationStart', 'redirectStart', 'redirectStart',
  'redirectEnd', 'fetchStart', 'domainLookupStart',
  'domainLookupEnd', 'connectStart', 'secureConnectionStart',
  'connectEnd', 'requestStart', 'responseStart', 'responseEnd',
  'unloadEventStart', 'unloadEventEnd', 'domLoading',
  'domInteractive', 'msFirstPaint', 'domContentLoadedEventStart',
  'domContentLoadedEventEnd', 'domContentLoaded', 'domComplete',
  'loadEventStart', 'loadEventEnd'
];

/**
 * Retrieves performance object keys.
 * Helper function to cover browser
 * inconsistencies.
 *
 * @param {PerformanceTiming} Object holding time data
 * @return {Array} list of PerformanceTiming properties names
 */
__Profiler.prototype._getPerfObjKeys = function(obj) {
  var keys = Object.keys(obj);
  return keys.length ? keys : Object.keys(Object.getPrototypeOf(obj));
}

/**
 * Defines sections of the chart.
 * According to specs there are three:
 * network, server and browser.
 *
 * @return {Array} chart sections.
 */
__Profiler.prototype._getSections = function() {
  return Array.prototype.indexOf ? [{
      name: 'network',
      color: [224, 84, 63],
      firstEventIndex: this.eventsOrder.indexOf('navigationStart'),
      lastEventIndex: this.eventsOrder.indexOf('connectEnd'),
      startTime: 0,
      endTime: 0
    }, {
      name: 'server',
      color: [255, 188, 0],
      firstEventIndex: this.eventsOrder.indexOf('requestStart'),
      lastEventIndex: this.eventsOrder.indexOf('responseEnd'),
      startTime: 0,
      endTime: 0
    }, {
      name: 'browser',
      color: [16, 173, 171],
      firstEventIndex: this.eventsOrder.indexOf('unloadEventStart'),
      lastEventIndex: this.eventsOrder.indexOf('loadEventEnd'),
      startTime: 0,
      endTime: 0
    }] : [];
}

/**
 * Creates information when performance.timing is not supported
 * @return {HTMLElement} message element
 */
__Profiler.prototype._createNotSupportedInfo = function() {
  var p = document.createElement('p');
  p.innerHTML = 'Navigation Timing API is not supported by your browser';
  return p;
}

/**
 * Matches events with the section they belong to
 * i.e. network, server or browser and sets
 * info about time bounds for the sections.
 */
__Profiler.prototype._matchEventsWithSections = function() {
  var data = this.timingData;

  var sections = this.sections;

  for (var i = 0, len = sections.length; i < len; i++) {
    var firstEventIndex = sections[i].firstEventIndex;
    var lastEventIndex = sections[i].lastEventIndex;

    var sectionOrder = this.eventsOrder.slice(firstEventIndex, lastEventIndex + 1);
    var sectionEvents = sectionOrder.filter(function(el){
      return data.hasOwnProperty(el);
    });

    sectionEvents.sort(function(a, b){
      return data[a].time - data[b].time;
    })

    firstEventIndex = sectionEvents[0];
    lastEventIndex = sectionEvents[sectionEvents.length - 1];

    sections[i].startTime = data[firstEventIndex].time;
    sections[i].endTime = data[lastEventIndex].time;

    for(var j = 0, flen = sectionEvents.length; j < flen; j++) {
      var item = sectionEvents[j];
      if(data[item]) {
        data[item].sectionIndex = i;
      }
    }
  }
}

/**
 * Gets timing data and calculates
 * when events occured as the original
 * object contains only timestamps.
 *
 * @return {Object} Hashmap of the event names
 * and times when they occured relatvely to
 * the page load start.
 */
__Profiler.prototype._getData = function() {
  if (!window.performance) {
    return;
  }

  var data = window.performance;
  var timingData = data.timing;
  var eventNames = this._getPerfObjKeys(timingData);
  var events = {};

  var startTime = timingData.navigationStart || 0;
  var eventTime = 0;
  var totalTime = 0;

  for(var i = 0, l = eventNames.length; i < l; i++) {
    var evt = timingData[eventNames[i]];

    if (evt && evt > 0) {
      eventTime = evt - startTime;
      events[eventNames[i]] = { time: eventTime };

      if (eventTime > totalTime) {
        totalTime = eventTime;
      }
    }
  }

  this.totalTime = totalTime;

  return events;
}

/**
 * Actually init the chart
 */
__Profiler.prototype._init = function() {
  this.timingData = this._getData();
  this.sections = this._getSections();

  if (this.timingData && this.sections.length) {
    this._matchEventsWithSections();
  }

  var output = "";
  var skipEvents = [];

  for (var i = 0, l = this.eventsOrder.length; i < l; i++) {
    var evt = this.eventsOrder[i];

    if (!this.timingData.hasOwnProperty(evt)) {
      continue;
    }

    var item = this.timingData[evt];
    var startIndex = evt.indexOf('Start');
    var isBlockStart = startIndex > -1;
    var hasBlockEnd = false;

    if (isBlockStart) {
      eventName = evt.substr(0, startIndex);
      hasBlockEnd = this.eventsOrder.indexOf(eventName + 'End') > -1;
    }

    if (isBlockStart && hasBlockEnd) {
      item.label = eventName;
      item.timeEnd = this.timingData[eventName + 'End'].time;
      skipEvents.push(eventName + 'End');

      var sectionData = this.sections[item.sectionIndex];
      var options = {
        color : sectionData.color,
        sectionTimeBounds : [sectionData.startTime, sectionData.endTime],
        eventTimeBounds : [item.time, item.timeEnd],
        label : item.label
      }

      start = options.eventTimeBounds[0];
      stop = options.eventTimeBounds[1];
      timeLabel = start + '-' + stop;
      output += eventName + " " + timeLabel + " ms<br>\n";
    }
  }

  var el = document.createElement('div');
  el.style.cssText = 'font-size:12px;line-height:1em;z-index:99999;text-align:left;' +
  'font-family:Calibri,\'Lucida Grande\',Arial,sans-serif;text-shadow:none;box-' +
  'shadow:none;display:inline-block;color:#444;font-' +
  'weight:normal;border:none;margin:0;padding:0;background:none;background:#FFFDF2;background:rgba(255,253,242,.99);padding:20px;display:block;';
  el.innerHTML = output;
  document.body.appendChild(el)
}

/**
 * Build the overlay with the timing chart
 * @param {?HTMLElement} element If provided
 * the chart will be render in the container.
 * If not provided, container element will be created
 * and appended to the page.
 * @param {?Number} timeout Optional timeout to execute
 * timing info. Can be used to catch all events.
 * if not provided will be executed immediately.
 */
__Profiler.prototype.init = function(timeout) {
  if (timeout && parseInt(timeout, 10) > 0) {
    var self = this;
    setTimeout(function() {
      self._init();
    }, timeout);
  } else {
    this._init();
  }
}

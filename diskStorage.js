// index.js

/**
*  Copyright (C) 2012 10gen Inc.
*
*  This program is free software: you can redistribute it and/or  modify
*  it under the terms of the GNU Affero General Public License, version 3,
*  as published by the Free Software Foundation.
*
*  This program is distributed in the hope that it will be useful,
*  but WITHOUT ANY WARRANTY; without even the implied warranty of
*  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
*  GNU Affero General Public License for more details.
*
*  You should have received a copy of the GNU Affero General Public License
*  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var AGE_BAR_HEIGHT = 50;
var BAR_HEIGHT = 110;
var SIZE_BAR_HEIGHT = 50;
var SUMMARY_BAR_WIDTH = 20;

var _data = null;

function percentStr(val) {
  return (val * 100).toFixed(2);
}

var bsonSizeToDiskSizeRatio = function(d) {
  return d.bsonSize / d.onDiskSize;
}

var nonBsonRecSizeToDiskSizeRatio = function(d) {
  return (d.recSize - d.bsonSize) / d.onDiskSize;
}

var avgRecSize = function(d) {
  return d.recSize / d.numEntries;
}

var charactRatio = function(boundaries) {
  return function(d) {
    return boundaries.ranged(d.charactSum / d.charactCount);
  };
}

function handleLoad() {
  var request = "http://localhost:28017/";
  request += $("#database").val() + "/";
  request += "$cmd/";
  request += "?filter_storageDetails=" + $("#collection").val();
  request += "&filter_analyze=diskStorage";
  if ($("#allExtents").prop("checked")) {
    alert("unsupported");
    return;
  } else {
    request += "&filter_extent=" + $("#extent").val();
  }
  request += "&filter_granularity=" + $("#granularity").val();
  if ($("#showRecords").prop("checked")) {
    request += "&filter_showRecords=true";
  }
  request += "&limit=1";
  request += "&jsonp=?";
  $("#requestUrl").text(request);
  $.getJSON(request,
  {
  },
  function(data) {
    $("#queryJson").text(JSON.stringify(data.query));
    handleData(data);
  });
}

function handleData(data) {
  var barSize = + document.getElementById("barWidth").value;
  _data = data;
  if (_data.rows) {
    _data = _data.rows[0];
  }
  render(_data, barSize);
  d3.select("#fileSelect").style({display: "none"});
  d3.select("#render").style({display: null});
}

function handleRender() {
  var barSize = + document.getElementById("barWidth").value;
  d3.select("#graphs").selectAll("*").remove();
  d3.select("#summaryGraphs").selectAll("*").remove();
  render(_data, barSize);
}

function computeBoundaries(arr, func, minIsZero) {
  var all = arr.map(func).filter(function(d) { return !isNaN(d); });
  return {
    min: minIsZero ? 0 : Math.min.apply(null, all),
    max: Math.max.apply(null, all),
    ranged: function(val) {
      return ((val - this.min) / (this.max - this.min));
    }
  }
}

function computeCharactBoundaries(arr) {
  return computeBoundaries(arr, function(ex) {
    return ex.charactSum / ex.charactCount;
  }, false);
}

function computeSizeBoundary(arr) {
  return computeBoundaries(arr, avgRecSize, true);
}

function render(data, barSize) {
  //TODO(andrea.lattuada) refactor
  if (data.extents) {
    var summaryGraphs = d3.select("#summaryGraphs");
    appendDescDiv(summaryGraphs, "collection", data, "coll-desc");
    var allChunks = _.flatten(
        data.extents.map(function(ex) { return ex.chunks }));
    var charactBoundaries = computeCharactBoundaries(allChunks);
    var sizeBoundary = computeSizeBoundary(allChunks);
    for (var i = 0; i < data.extents.length; ++i) {
      var extentData = data.extents[i];
      renderExtent(i, extentData, barSize, charactBoundaries, sizeBoundary);
      var collSummaryExtent = summaryGraphs.append("a")
        .attr("onclick", "highlightExtent(" + i + "); return true;")
        .attr("href", "#extent" + i).append("div")
        .attr("class", "extent-summary");
      renderGraph(collSummaryExtent, [extentData], SUMMARY_BAR_WIDTH,
                  charactBoundaries, sizeBoundary);
    }
  } else if (data.chunks) {
    var charactBoundaries = computeCharactBoundaries(data.chunks);
    var sizeBoundary = computeSizeBoundary(data.chunks);
    renderExtent(" range " + data.range, data, barSize, charactBoundaries, sizeBoundary);
    if (data.records) {
        renderExtentRecords(data);
    }
  }
}

function highlightExtent(extentNum) {
  d3.selectAll(".extent").style({"background-color": null});
  d3.select("#graphs").select("a[name='extent" + extentNum + "']")
    .select("div").style({"background-color": "#ffc"});
}

function appendDescDiv(toElm, title, data, clazz) {
  toElm.append("div").attr("class", clazz).html(
      title + "<br/>" +
      "size: " + data.onDiskSize + "<br/>" +
      "records: " + data.numEntries + "<br/>" +
      "records size: " + data.recSize + "<br/>" +
      "avg. record size: " + (data.recSize / data.numEntries).toFixed(4) + "<br/>" +
      "(% of ext used: " + percentStr(data.recSize / data.onDiskSize) + ")<br/>" +
      "BSONs size: " + data.bsonSize + "<br/>" +
      "(% of ext used: " + percentStr(data.bsonSize / data.onDiskSize) + ")<br/>" +
      "padding: " + (data.recSize / data.bsonSize).toFixed(4) + "<br/>" +
      "avg. charact. (age?): " +
          (data.charactSum / data.charactCount).toFixed(4) + "<br/>");
}

function renderExtent(extentNum, extentData, barSize, charactBoundaries,
                      sizeBoundary) {
  var extentDiv = d3.select("#graphs").append("a")
    .attr("name", "extent" + extentNum).append("div").attr("class", "extent");
  renderGraph(extentDiv.append("div"), [extentData], SUMMARY_BAR_WIDTH,
                      charactBoundaries, sizeBoundary);
  appendDescDiv(extentDiv, "extent " + extentNum, extentData, "extent-desc");
  renderGraph(extentDiv.append("div"), extentData.chunks, barSize,
                    charactBoundaries, sizeBoundary);
}

function renderGraph(div, arr, barSize, charactBoundaries, sizeBoundary) {
  var EXTENT_PADDING = 1;
  var chunkOnDiskSizes = arr.map(function (d) {
    return d.onDiskSize;
  });
  var maxChunkLength = d3.max(chunkOnDiskSizes);
  var fullWidth = d3.sum(chunkOnDiskSizes) / maxChunkLength * barSize +
                  arr.length + EXTENT_PADDING;
  var extentChartAvgSize = div.append("svg")
    .attr("class", "extent-chart extent-chart-avgsize")
    .attr("width", fullWidth)
    .attr("height", SIZE_BAR_HEIGHT);
  var extentChart = div.append("svg")
    .attr("class", "extent-chart extent-chart-usage")
    .attr("width", fullWidth)
    .attr("height", BAR_HEIGHT);
  var extentChartCharact = div.append("svg")
    .attr("class", "extent-chart extent-chart-charact")
    .attr("width", fullWidth)
    .attr("height", AGE_BAR_HEIGHT);
  var x = function() {
    var nextX = 0;
    return function (d, i) {
      var curX = nextX;
      nextX += barSize * d.onDiskSize / maxChunkLength + 1;
      return curX + EXTENT_PADDING;
    };
  };
  var avgsizey = d3.scale.linear()
    .domain([0, 1])
    .range([0, SIZE_BAR_HEIGHT]);
  var characty = d3.scale.linear()
    .domain([0, 1])
    .range([0, AGE_BAR_HEIGHT]);
  var y = d3.scale.linear()
    .domain([0, 1])
    .range([0, BAR_HEIGHT]);
  var xsize = function (d, i) {
    return d.onDiskSize / maxChunkLength * barSize;
  }
  extentChartAvgSize.selectAll("rect").data(arr)
    .enter().append("rect")
    .attr("class", "avgSize")
    .attr("x", x())
    .attr("width", xsize)
    .attr("y", function(d) {
      return avgsizey(1) - avgsizey(sizeBoundary.ranged(avgRecSize(d)));
    })
    .attr("height", function(d) {
      return avgsizey(sizeBoundary.ranged(avgRecSize(d)));
    });
  var enterapp = extentChart.selectAll("rect").data(arr).enter().append("svg:g");
  enterapp.on("mouseout", function(datum) {
    $("#popup").hide();
  });
  enterapp.on("mouseover", function(datum) {
    var datum = d3.select(this).datum();
    var freeRecs = d3.select(this).datum().freeRecsPerBucket;
    console.log(datum);
    $("#popup").show();
    var popup = d3.select("#popup");
    var offset = $(this).offset();
    popup.style("top", offset.top + 100).style("left", offset.left + 10);
    var xlog = d3.scale.log().domain([1, 500000]).range([0, 100]);
    popup.selectAll("*").remove();
    popup.append("div").html("chunk" + "<br/>" +
      "length: " + datum.onDiskSize + "<br/>" +
      "num. records: " + datum.numEntries + "<br/>" +
      "rec. size: " + datum.recSize);
    var popupEnter = popup.append("svg")
      .attr("width", 150)
      .attr("height", 11 * freeRecs.length + 1)
      .selectAll("rect").data(freeRecs).enter();
    popupEnter.append("rect")
        .attr("y", function (d, i) { return i * 11 + 1 })
        .attr("x", 50)
        .attr("width", xlog) 
        .attr("height", 10)
        .attr("fill", "#888");
    popupEnter.append("svg:text")
        .text(function (d, i) { return Math.pow(2, i + 5) + "B " + d.toFixed(2); })
        .attr("y", function (d, i) { return i * 11 + 1 })
        .attr("fill", "black")
        .attr("dy", ".73em")
        .attr("text-anchor", "start");
  });
  enterapp.append("rect")
    .attr("x", x())
    .attr("width", xsize)
    .attr("height", BAR_HEIGHT)
    .attr("fill", "white");
  enterapp.append("rect")
    .attr("class", "bsonSize")
    .attr("x", x())
    .attr("width", xsize)
    .attr("height", _.compose(y, bsonSizeToDiskSizeRatio));
  enterapp.append("rect")
    .attr("class", "recSize")
    .attr("x", x())
    .attr("width", xsize)
    .attr("y", _.compose(y, bsonSizeToDiskSizeRatio))
    .attr("height", _.compose(y, nonBsonRecSizeToDiskSizeRatio));
  /*enterapp.append("rect")*/
  /*.attr("class", "freeRec")*/
  /*.attr("x", x())*/
  /*.attr("width", xsize)*/
  /*.attr("y", _.compose(y, function(d) {*/
  /*return bsonSizeToDiskSizeRatio(d) + nonBsonRecSizeToDiskSizeRatio(d);*/
  /*}))*/
  /*.attr("height", _.compose(y, function(d) {*/
  /*return d.freeRecsSize;*/
  /*}));*/
  extentChartCharact.selectAll("rect").data(arr)
    .enter().append("rect")
    .attr("class", "charact")
    .attr("x", x())
    .attr("width", xsize)
    // .attr("y", _.compose(characty, charactRatio(charactBoundaries)))
    .attr("height", _.compose(characty, charactRatio(charactBoundaries)));
  var xfunc = x();
  extentChartCharact.selectAll("g").data(arr)
    .enter().append("svg:g")
    .each(function (d, i) {
      var xpos = xfunc(d);
      if (!d.charactCount) {
        d3.select(this).append("rect")
          .attr("class", "missing-datum")
          .attr("x", xpos)
          .attr("width", xsize(d))
          .attr("height", 5)
          .attr("y", 10);
      }
    });
}

var BYTES_PER_PIXEL = 4;

function renderExtentRecords(data) {
  console.log(data.range);
  var x = d3.scale.linear()
    .domain(data.range)
    .range([0, data.onDiskSize / BYTES_PER_PIXEL]);
  var width = d3.scale.linear()
    .domain([0, data.onDiskSize])
    .range([0, data.onDiskSize / BYTES_PER_PIXEL]);
  var recsDiv = d3.select("#graphs")
    .append("div").attr("class", "extent-recs");
  var svg = recsDiv.append("svg")
    .attr("width", data.onDiskSize / BYTES_PER_PIXEL + 1).attr("height", 100)
  var enter = svg.selectAll().data(data.records).enter();
  var enterapp = enter.append("svg:g").attr("class", "record")
  enterapp.append("rect")
    .attr("class", "recSize")
    .attr("y", 3)
    .attr("x", _.compose(x, function(d) { return d.ofs }))
    .attr("width", _.compose(width, function(d) { return d.recSize }))
    .attr("height", 50);
  enterapp.append("rect")
    .attr("class", "bsonSize")
    .attr("y", 3)
    .attr("x", _.compose(x, function(d) { return d.ofs }))
    .attr("width", _.compose(width, function(d) { return d.bsonSize }))
    .attr("height", 50);
  enterapp.on("mouseout", function(datum) {
    $("#popup").hide();
  });
  enterapp.on("mouseover", function(datum) {
    var datum = d3.select(this).datum();
    console.log(datum);
    $("#popup").show();
    var popup = d3.select("#popup");
    var offset = $(this).offset();
    popup.style("top", offset.top - 50).style("left", offset.left + 10);
    popup.selectAll("*").remove();
    popup.append("div")
      .html("id -> " + datum.id + "<br/>" +
            "starts at " + datum.ofs + "<br/>" +
            "size: " + datum.onDiskSize + "<br/>" +
            "BSON size: " + datum.bsonSize + "<br/>" +
            "charact. value: " + datum.charact + "<br/>");
  });

  var enterDel = svg.selectAll().data(data.deletedRecords).enter();
  var enterappDel = enterDel.append("svg:g").attr("class", "deletedRecord")
  enterappDel.append("rect")
    .attr("class", "delRec")
    .attr("y", 3)
    .attr("x", _.compose(x, function(d) { return d.ofs }))
    .attr("width", _.compose(width, function(d) { return d.recSize }))
    .attr("height", 50);

  enterappDel.on("mouseout", function(datum) {
    $("#popup").hide();
  });
  enterappDel.on("mouseover", function(datum) {
    var datum = d3.select(this).datum();
    console.log(datum);
    $("#popup").show();
    var popup = d3.select("#popup");
    var offset = $(this).offset();
    popup.style("top", offset.top - 50).style("left", offset.left + 10);
    popup.selectAll("*").remove();
    popup.append("div")
      .html("deleted record<br/>" +
            "starts at " + datum.ofs + "<br/>" +
            "size: " + datum.onDiskSize + "<br/>");
  });

  var tick = svg.selectAll()
      .data(x.ticks((data.range[1] - data.range[0]) / 1000));

  var tickEnter = tick.enter();
  //.append("svg:g")
  //    .attr("class", "tick")
  //    .attr("x", x)
  //    .style("opacity", 1e-6);

  tickEnter.append("svg:line")
      .attr("stroke", "black")
      .attr("x1", x)
      .attr("x2", x)
      .attr("y1", 60)
      .attr("y2", 60 * 7 / 6);

  tickEnter.append("svg:text")
      .attr("text-anchor", "middle")
      .attr("dy", "1em")
      .attr("y", 60 * 7 / 6)
      .attr("x", x)
      .text(function(d) { return d / 1000 + "K"; });
}
'use strict';

angular.module('myApp.view1', ['ngRoute'])

.config(['$routeProvider', function($routeProvider, $httpProvider) {
  $routeProvider.when('/view1', {
    templateUrl: 'view1/view1.html',
    controller: 'View1Ctrl'
  });
  /*$httpProvider.defaults.useXDomain = true;
  delete $httpProvider.defaults.headers.common['X-Requested-With'];*/
}])

.controller('View1Ctrl', ['$scope', 'dataService', function($scope, dataService) {
  $scope.result = {
        statusText: "Wait",
        status: 800
  };
  $scope.columns = [];

  dataService.getExcelWeatherData().then(function(dataResponse) {
    $scope.result = dataResponse;
    console.log($scope.result);
    //$scope.data = processDataHourly($scope.result.data);
    var data = d3.csvParse(dataResponse.data, function(d) {
      return {
        dateTime: d['date-time'],
        pressure: +d['atmospheric pressure (mBar)'],
        rainfall: +d['rainfall (mm)'],
        windSpeed: +d['wind speed (m/s)'],
        windDirection: +d['wind direction (degrees)'],
        temperature: +d['surface temperature (C)'],
        humidity: +d['relative humidity (%)']
      }
    });
    $scope.columns = data.columns;
    // reduce to hourly averages
    $scope.data = reduceData(data);
    //$scope.dataDaily = processDataDaily($scope.result.data);
  });

  // reduce data with d3
  function reduceData(data) {
    //console.log(data);
    var dataByDate = d3.nest()
        .key(function(d) { return d.dateTime.substring(0, 13); })
        .rollup(function(v) { return {
          pressure: d3.mean(v, function(d) { return d.pressure; }),
          rainfall: d3.sum(v, function(d) { return d.rainfall; }),
          windSpeed: d3.mean(v, function(d) { return d.windSpeed; }),
          windDirection: d3.mean(v, function(d) { return d.windDirection; }),
          temperature: d3.mean(v, function(d) { return d.temperature; }),
          humidity: d3.mean(v, function(d) { return d.humidity; })
        }; })
        .entries(data);
    console.log(dataByDate);
  }

  function weather(date, pressure, rainfall, windSpeed, windDir, temperature, humidity, solarFlux, battery) {
    this.date = date;
    this.pressure = pressure;
    this.rainfall = rainfall;
    this.windSpeed = windSpeed;
    this.windDirection = windDir;
    this.temperature = temperature;
    this.humidity = humidity;
    this.solarFlux = solarFlux;
    this.battery = battery;
  };

  // reduce data to daily avg
  function processDataDaily(data) {
    // divide into lines
    var splitArray = data.split("\n")
    $scope.titles = splitArray[0].split(",");
    console.log("Array size is " + (splitArray.length - 1));
    var dailyWeather = [];
    var date = "";
    var dailyCount = 0;
    var avgArray = [];
    for (var i = 1; i < splitArray.length; i++) {
      var recordArray = splitArray[i].split(',');
      var currentDate = recordArray[0].substr(0, 10);
      if (date === "") {
        date = currentDate;
      }
      if (date === currentDate) {
        dailyCount++;
        if (dailyCount <= 1) {
          avgArray = recordArray.slice(1);
          console.log(avgArray);
        } else {
          for (var j = 1; j < recordArray.length; j++) {
            avgArray[j - 1] = (avgArray[j - 1] + parseInt(recordArray[j], 10)) / 2;
          }
        }
      } else if (dailyCount > 0) {
        dailyWeather.push(
            new weather(date,
                avgArray[0],
                avgArray[1],
                avgArray[2],
                avgArray[3],
                avgArray[4],
                avgArray[5],
                avgArray[6],
                avgArray[7]));
        avgArray = recordArray.slice(1);;
        dailyCount = 1;
        date = currentDate;
      }
    }
    console.log(dailyWeather);
    return dailyWeather;
  }

  function processDataHourly(data) {
    // divide into lines
    var splitArray = data.split("\n")
    $scope.titles = splitArray[0].split(",");
    console.log("Array size is " + (splitArray.length - 1));
    var hourlyWeather = [];
    var dateTime = "";
    var hourCount = 0;
    var avgArray = [];
    for (var i = 1; i < splitArray.length; i++) {
      var recordArray = splitArray[i].split(',');
      var currentDateTime = recordArray[0].substr(0, 13);
      //console.log(currentDateTime);
      if (dateTime === "") {
        dateTime = currentDateTime;
      }
      if (dateTime === currentDateTime || currentDateTime.substr(11,13) == "24") {
        hourCount++;
        if (hourCount <= 1) {
          avgArray = recordArray.slice(1);
          console.log(avgArray);
        } else {
          for (var j = 1; j < recordArray.length; j++) {
            avgArray[j - 1] = (avgArray[j - 1] + parseInt(recordArray[j], 10)) / 2;
          }
        }
      } else if (hourCount > 0) {
        hourlyWeather.push(
            new weather(dateTime + "h",
                avgArray[0],
                avgArray[1],
                avgArray[2],
                avgArray[3],
                avgArray[4],
                avgArray[5],
                avgArray[6],
                avgArray[7]));
        avgArray = recordArray.slice(1);;
        hourCount = 1;
        dateTime = currentDateTime;
      }
    }
    console.log(hourlyWeather);
    return hourlyWeather;
  }
}])


.service('dataService', function($http) {
  delete $http.defaults.headers.common['X-Requested-With'];
  this.getExcelWeatherData = function() {
    return $http({
      method: 'GET',
      url: 'http://xweb.geos.ed.ac.uk/~weather/jcmb_ws/JCMB_2015.csv',
      dataType: 'csv',
      headers: {}
    });
  }
})

.directive('weatherVisualization', function () {

  // constants
  var margin = 20,
      width = 960,
      height = 500 - .5 - margin,
      color = d3.interpolateRgb("#f77", "#77f");

  return {
    restrict: 'E',
    scope: {
      val: '=',
      grouped: '='
    },
    link: function (scope, element, attrs) {

      // set up initial svg object
      var vis = d3.select(element[0])
          .append("svg")
          .attr("width", width)
          .attr("height", height + margin + 100);

      var svg = d3.select("svg");

      scope.$watch('val', function (newVal, oldVal) {

        // clear the elements inside of the directive
        vis.selectAll('*').remove();

        // if 'val' is undefined, exit
        if (!newVal) {
          return;
        }

        var x = d3.scaleBand().rangeRound([0, width]).padding(0.1),
            y = d3.scaleLinear().rangeRound([height, 0]);

        var g = svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        x.domain(data.map(function(d) { return d.letter; }));
        y.domain([0, d3.max(data, function(d) { return d.frequency; })]);

        g.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x));

        g.append("g")
            .attr("class", "axis axis--y")
            .call(d3.axisLeft(y).ticks(10, "%"))
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", "0.71em")
            .attr("text-anchor", "end")
            .text("Frequency");

        g.selectAll(".bar")
            .data(data)
            .enter().append("rect")
            .attr("class", "bar")
            .attr("x", function(d) { return x(d.letter); })
            .attr("y", function(d) { return y(d.frequency); })
            .attr("width", x.bandwidth())
            .attr("height", function(d) { return height - y(d.frequency); });

        // Based on: http://mbostock.github.com/d3/ex/stack.html
        var n = newVal.length, // number of layers
            m = newVal[0].length, // number of samples per layer
            data = d3.layout.stack()(newVal);

        var mx = m,
            my = d3.max(data, function(d) {
              return d3.max(d, function(d) {
                return d.y0 + d.y;
              });
            }),
            mz = d3.max(data, function(d) {
              return d3.max(d, function(d) {
                return d.y;
              });
            }),
            x = function(d) { return d.x * width / mx; },
            y0 = function(d) { return height - d.y0 * height / my; },
            y1 = function(d) { return height - (d.y + d.y0) * height / my; },
            y2 = function(d) { return d.y * height / mz; }; // or `my` not rescale

        // Layers for each color
        // =====================

        var layers = vis.selectAll("g.layer")
            .data(data)
            .enter().append("g")
            .style("fill", function(d, i) {
              return color(i / (n - 1));
            })
            .attr("class", "layer");

        // Bars
        // ====

        var bars = layers.selectAll("g.bar")
            .data(function(d) { return d; })
            .enter().append("g")
            .attr("class", "bar")
            .attr("transform", function(d) {
              return "translate(" + x(d) + ",0)";
            });

        bars.append("rect")
            .attr("width", x({x: .9}))
            .attr("x", 0)
            .attr("y", height)
            .attr("height", 0)
            .transition()
            .delay(function(d, i) { return i * 10; })
            .attr("y", y1)
            .attr("height", function(d) {
              return y0(d) - y1(d);
            });

        // X-axis labels
        // =============

        var labels = vis.selectAll("text.label")
            .data(data[0])
            .enter().append("text")
            .attr("class", "label")
            .attr("x", x)
            .attr("y", height + 6)
            .attr("dx", x({x: .45}))
            .attr("dy", ".71em")
            .attr("text-anchor", "middle")
            .text(function(d, i) {
              return d.date;
            });

        // Chart Key
        // =========

        var keyText = vis.selectAll("text.key")
            .data(data)
            .enter().append("text")
            .attr("class", "key")
            .attr("y", function (d, i) {
              return height + 42 + 30*(i%3);
            })
            .attr("x", function (d, i) {
              return 155 * Math.floor(i/3) + 15;
            })
            .attr("dx", x({x: .45}))
            .attr("dy", ".71em")
            .attr("text-anchor", "left")
            .text(function(d, i) {
              return d[0].user;
            });

        var keySwatches = vis.selectAll("rect.swatch")
            .data(data)
            .enter().append("rect")
            .attr("class", "swatch")
            .attr("width", 20)
            .attr("height", 20)
            .style("fill", function(d, i) {
              return color(i / (n - 1));
            })
            .attr("y", function (d, i) {
              return height + 36 + 30*(i%3);
            })
            .attr("x", function (d, i) {
              return 155 * Math.floor(i/3);
            });


        // Animate between grouped and stacked
        // ===================================

        function transitionGroup() {
          vis.selectAll("g.layer rect")
              .transition()
              .duration(500)
              .delay(function(d, i) { return (i % m) * 10; })
              .attr("x", function(d, i) { return x({x: .9 * ~~(i / m) / n}); })
              .attr("width", x({x: .9 / n}))
              .each("end", transitionEnd);

          function transitionEnd() {
            d3.select(this)
                .transition()
                .duration(500)
                .attr("y", function(d) { return height - y2(d); })
                .attr("height", y2);
          }
        }

        function transitionStack() {
          vis.selectAll("g.layer rect")
              .transition()
              .duration(500)
              .delay(function(d, i) { return (i % m) * 10; })
              .attr("y", y1)
              .attr("height", function(d) {
                return y0(d) - y1(d);
              })
              .each("end", transitionEnd);

          function transitionEnd() {
            d3.select(this)
                .transition()
                .duration(500)
                .attr("x", 0)
                .attr("width", x({x: .9}));
          }
        }

        // reset grouped state to false
        scope.grouped = false;

        // setup a watch on 'grouped' to switch between views
        scope.$watch('grouped', function (newVal, oldVal) {
          // ignore first call which happens before we even have data from the Github API
          if (newVal === oldVal) {
            return;
          }
          if (newVal) {
            transitionGroup();
          } else {
            transitionStack();
          }
        });
      });
    }
  }
});
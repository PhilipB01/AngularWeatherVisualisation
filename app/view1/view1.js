'use strict';

var view1 = angular.module('myApp.view1', ['ngRoute'])

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
  $scope.data = [];
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
    $scope.data = reduceData(data);
    $scope.dataDaily = processDataDaily($scope.result.data);
  });

  // reduce data with d3
  function reduceData(data) {
    //console.log(data);
    var dataByDate = d3.nest()
        .key(function(d) { return d.dateTime.substring(0, 13); })
        .rollup(function(v) { return {
          pressure: d3.mean(v, function(d) { return d.pressure; }),
          rainfall: d3.mean(v, function(d) { return d.rainfall; }),
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
});
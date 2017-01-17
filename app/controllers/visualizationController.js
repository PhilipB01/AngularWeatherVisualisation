'use strict';

app.controller('VisualizationCtrl', ['$scope', 'dataService', 'd3Service', function($scope, dataService, d3Service) {
    $scope.result = {
        statusText: "Wait",
        status: 800
    };
    $scope.columns = [];
    $scope.data = [];
    $scope.currentMonth = "January";
    $scope.currentDay;

    $scope.onBarClick = function(item) {
        $scope.$apply(function() {
            $scope.monthData = getDailyDataForMonth(item.key);


            $scope.humidity = item.value.humidity;
            $scope.currentMonth = formatDate(item.key);
            $scope.currentDay = "";

            console.log("Humidity is: " + $scope.humidity);
        });
    };

    $scope.onDayClick = function(item) {
        $scope.$apply(function() {
            console.log("Day click!");
            console.log(item);
            /*if (!$scope.showHumidityPanel)
             $scope.showHumidityPanel = true;*/
            $scope.humidity = item.value.humidity;
            console.log("Humidity is: " + $scope.humidity);

            $scope.currentDay = formatDate(item.key);
            console.log($scope.currentDay);
        });
    }

    dataService.getExcelWeatherData().then(function(dataResponse) {
        $scope.result = dataResponse;
        //$scope.data = processDataHourly($scope.result.data);
        d3Service.d3().then(function(d3) {
            var data = d3.csvParse(dataResponse.data, function (d) {
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

            $scope.parsedData = data;
            $scope.data = reduceData(data, 7);
            $scope.columns = data.columns;
        });
        //$scope.data = processDataDaily(dataResponse.data);

    });

    // reduce data with d3
    function reduceData(data, pos) {
        //console.log(data);
        var dataByDate = d3.nest()
            .key(function(d) { return d.dateTime.substring(0, pos); })
            .rollup(function(v) { return {
                pressure: d3.mean(v, function(d) { return d.pressure; }),
                rainfall: d3.sum(v, function(d) { return d.rainfall; }),
                windSpeed: d3.mean(v, function(d) { return d.windSpeed; }),
                windDirection: d3.mean(v, function(d) { return d.windDirection; }),
                temperature: d3.mean(v, function(d) { return d.temperature; }),
                humidity: d3.mean(v, function(d) { return d.humidity; })
            }; })
            .entries(data);

        return dataByDate;
    }

    function getDailyDataForMonth(month) {
        var data = reduceData($scope.parsedData, 10);
        return data.filter(function(item, i) {
            //console.log(month);
            //console.log(item.key.substring(0, 7));
            return item.key.substring(0, 7) == month;
        });
    }

    function formatDate(dateTime) {
        var year = dateTime.substr(0, 4);
        var month = dateTime.substr(5, 7);
        var day = dateTime.substr(8, 10) || "01";

        var date = new Date(month + "/" + day + "/" + year),
            locale = "en-us";
        if (dateTime.length < 10) {
            return date.toLocaleString(locale, {month: "long"});
        } else {
            return parseInt(day);
        }
    }

    /*
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
        return dailyWeather;
    }

    function processDataHourly(data) {
        // divide into lines
        var splitArray = data.split("\n")
        $scope.titles = splitArray[0].split(",");
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
    }*/
}]);
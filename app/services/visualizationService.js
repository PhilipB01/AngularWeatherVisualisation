'use strict';

app.service('dataService', function($http) {
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
'use strict';

var view1 = angular.module('myApp.view1', ['ngRoute'])

.config(['$routeProvider', function($routeProvider, $httpProvider) {
  $routeProvider.when('/view1', {
    templateUrl: 'view1/view1.html',
    controller: 'View1Ctrl'
  });
  /*$httpProvider.defaults.useXDomain = true;
  delete $httpProvider.defaults.headers.common['X-Requested-With'];*/
}]);
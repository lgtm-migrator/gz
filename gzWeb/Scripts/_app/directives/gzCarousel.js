﻿(function () {
    'use strict';

    APP.directive('gzCarousel', ['helpers', '$timeout', directiveFactory]);

    function directiveFactory(helpers, $timeout) {
        return {
            restrict: 'E',
            scope: {
                gzSlides: '='
            },
            replace: true,
            templateUrl: function () {
                return helpers.ui.getTemplate('partials/directives/gzCarousel.html');
            },
            controller: ['$scope', '$element', '$attrs', function ($scope, $element, $attrs) {
                var DELAY = 10000;
                var timeoutPromise = undefined;
                $scope.currentIndex = 0;
                $scope.showControls = !('gzNoControls' in $attrs);
                $scope.showIndicators = !('gzNoIndicators' in $attrs);
                
                function normalizeIndex(index) {
                    return (index + $scope.gzSlides.length) % $scope.gzSlides.length;
                }

                function autoplay(index) {
                    timeoutPromise = $timeout(function () {
                        setSlide(index + 1);
                    }, DELAY);
                }

                function setSlide(index) {
                    $scope.currentIndex = normalizeIndex(index);
                    autoplay(index);
                }

                $scope.gotoNext = function () {
                    $scope.gotoSlide($scope.currentIndex + 1);
                };
                $scope.gotoPrevious = function () {
                    $scope.gotoSlide($scope.currentIndex - 1);
                };
                $scope.gotoSlide = function (index) {
                    if (angular.isDefined(timeoutPromise))
                        $timeout.cancel(timeoutPromise);
                    setSlide(index);
                }

                $scope.onHover = function () {
                    if (angular.isDefined(timeoutPromise))
                        $timeout.cancel(timeoutPromise);
                };
                $scope.onLeave = function () {
                    autoplay($scope.currentIndex);
                };

                $scope.calcMarginLeft = function (index) {
                    return ((index - $scope.currentIndex) * 100) + '%';
                }
                $scope.calcZIndex = function (index) {
                    var diff = index - $scope.currentIndex;
                    var z = -1;
                    if (diff === 0)
                        z = 2;
                    else if (diff === 1 || diff === 1 - $scope.gzSlides.length)
                        z = 1;
                    else if (diff === -1 || diff === $scope.gzSlides.length - 1)
                        z = 1;
                    return z;
                }

                var unregisterCollectionWatch = $scope.$watchCollection('gzSlides', function (newCollection, oldCollection) {
                    if (newCollection && newCollection.length > 0) {
                        setSlide(0);
                        unregisterCollectionWatch();
                    }
                });

                $scope.$on("$destroy", function (event) {
                    if (angular.isDefined(timeoutPromise))
                        $timeout.cancel(timeoutPromise);
                });
            }]
        };
    }
})();
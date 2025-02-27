﻿(function () {
    'use strict';
    var ctrlId = 'gameCtrl';
    APP.controller(ctrlId, ['$scope', '$controller', '$routeParams', '$sce', 'emCasino', '$window', '$interval', '$location', 'constants', '$rootScope', '$log', 'chat', 'message', '$timeout', ctrlFactory]);
    function ctrlFactory($scope, $controller, $routeParams, $sce, emCasino, $window, $interval, $location, constants, $rootScope, $log, chat, message, $timeout) {
        $controller('authCtrl', { $scope: $scope });

        var searchParams = null;
        $scope.game = null;
        $scope.gameLaunchData = null;
        $scope.gameUrl = null;

        function hideElement(selector) { angular.element(selector).css('top', -70); };
        function showElement(selector) { angular.element(selector).css('top', 0); };
        $scope.hideHeader = function () {
            hideElement('#header-nav');
            hideElement('#menu-up');
            $timeout(function () {
                showElement('#menu-down');
            }, 500);
        };
        $scope.showHeader = function () {
            hideElement('#menu-down');
            $timeout(function () {
                showElement('#header-nav');
                showElement('#menu-up');
            }, 500);
        };

        function loadGame() {
            //if (typeof navigator.mimeTypes['application/x-shockwave-flash'] != 'undefined') {
            //    message.warning("Flash player is not installed in your browser.");
            //}
            //else {
                var slug = $routeParams.slug;
                emCasino.getGames({
                    filterBySlug: [slug],
                    filterByPlatform: null,
                    expectedFields:
                        emCasino.FIELDS.Slug +
                        emCasino.FIELDS.Name +
                        emCasino.FIELDS.BackgroundImage +
                        emCasino.FIELDS.License +
                        emCasino.FIELDS.Width + 
                        emCasino.FIELDS.Height,
                    pageSize: 1,
                }).then(function (gamesResult) {
                    $scope.game = gamesResult.games[0];
                    if ($scope.game) {
                        $rootScope.playing = true;

                        function setGameDimensions() {
                            var percent = 0.8;
                            var windowWidth = $window.innerWidth;
                            //var windowHeight = $window.innerHeight - 70;
                            var windowHeight = $window.innerHeight;
                            if ($rootScope.mobile) {
                                $scope.gameWidth = windowWidth;
                                $scope.gameHeight = windowHeight;
                            }
                            else if ($scope.game.width === 0 && $scope.game.height === 0) {
                                $scope.gameWidth = windowWidth * 0.7;
                                $scope.gameHeight = windowHeight * 0.7;
                            }
                            else {
                                var windowAspect = windowWidth / windowHeight;
                                var gameAspect = $scope.game.width / $scope.game.height;
                                if (windowAspect >= 1) {
                                    $scope.gameHeight = Math.round(windowHeight * percent);
                                    $scope.gameWidth = Math.round($scope.gameHeight * gameAspect);
                                }
                                else {
                                    $scope.gameWidth = Math.round(windowWidth * percent);
                                    $scope.gameHeight = Math.round($scope.gameWidth / gameAspect);
                                }
                            }
                        }

                        setGameDimensions();
                        angular.element($window).bind('resize orientationchange', function () {
                            setGameDimensions();
                        });

                        window.appInsights.trackEvent("GAME PLAY", {
                            slug: $scope.game.slug,
                            name: $scope.game.name,
                            forFun: $scope.playForFun,
                            status: 'BEGIN'
                        });

                        emCasino.getLaunchUrl($scope.game.slug, null, !$scope.playForFun).then(function (launchDataResult) {
                            $scope.gameLaunchData = launchDataResult;
                            var launchUrl = launchDataResult.url.indexOf('http://') !== -1
                                ? launchDataResult.url.replace(/^http:\/\//i, 'https://')
                                : launchDataResult.url;
                            $scope.gameUrl = $sce.trustAsResourceUrl(launchUrl);

                            if ($rootScope.mobile) {
                                $scope.openFullscreen();
                                $timeout($scope.hideHeader, 3000);
                            }
                            else
                                $scope.isFullscreen = false;

                            window.appInsights.trackEvent("GAME PLAY", {
                                slug: $scope.game.slug,
                                name: $scope.game.name,
                                forFun: $scope.playForFun,
                                status: 'LAUNCH SUCCESS'
                            });
                        }, function (getLaunchUrlError) {
                            logError(getLaunchUrlError);
                            window.appInsights.trackEvent("GAME PLAY", {
                                slug: $scope.game.slug,
                                name: $scope.game.name,
                                forFun: $scope.playForFun,
                                status: 'LAUNCH FAILED'
                            });
                        });
                    }
                    else {
                        logError("No game found with slug '" + slug + "'. User-agent : " + navigator.userAgent);
                        var noGameFoundPromise = message.open({
                            nsType: 'modal',
                            nsSize: '600px',
                            nsTemplate: '_app/games/noGameFound.html',
                            nsCtrl: 'noGameFoundCtrl',
                            nsStatic: true,
                            nsShowClose: false
                        });
                        noGameFoundPromise.then($scope.backToGames);
                    }
                }, logError);
            //}
        }

        $scope.getGameWidth = function () {
            return $scope.isFullscreen && !$rootScope.mobile ? '100%' : $scope.gameWidth;
        };

        $scope.getGameHeight = function () {
            return $scope.isFullscreen && !$rootScope.mobile ? '100%' : $scope.gameHeight;
        };

        $scope._init(function () {
            var params = $location.search();
            $scope.playForFun = params.funMode === "true";
            delete params['funMode'];
            searchParams = Object.keys(params).length === 0 ? {} : params;
            $location.search({});
            if ($scope.playForFun)
                $location.search('funMode', true);
            $location.replace();

            loadGame();
            setClock();
        });

        $rootScope.$on(constants.events.CHAT_LOADED, function () {
            if ($rootScope.mobile)
                chat.hide();
            else
                chat.show();
        });

        function setClock() {
            var tickInterval = 1000;
            var tick = function () { $scope.clock = Date.now(); }
            $interval(tick, tickInterval);
            tick();
        }

        $scope.openFullscreen = function () {
            $scope.isFullscreen = true;
            chat.hide();
        }
        $scope.exitFullscreen = function () {
            chat.show();
            if ($rootScope.mobile)
                $scope.backToGames();
            else
                $scope.isFullscreen = false;
        }

        $scope.backToGames = function () {
            $location.path(constants.routes.games.path).search(searchParams);
        }

        $scope.$on('$locationChangeStart', function (event, next, current) {
            if (current.indexOf('?') === -1) {
                $rootScope.playing = false;
                $rootScope.$broadcast(constants.events.REQUEST_ACCOUNT_BALANCE);
                if ($scope.game) {
                    window.appInsights.trackEvent("GAME PLAY", {
                        slug: $scope.game.slug,
                        name: $scope.game.name,
                        forFun: $scope.playForFun,
                        status: 'STOP'
                    });
                }
                else {
                    window.appInsights.trackEvent("GAME PLAY", {
                        slug: $routeParams.slug,
                        userAgent: navigator.userAgent,
                        forFun: $scope.playForFun,
                        status: 'NO GAME'
                    });
                }
            }
        });

        function logError(error) {
            $log.error(error);
        };

        $scope.getGameTop = function () {
            //return $scope.gameLaunchData === null || $scope.isFullscreen ? ($rootScope.mobile ? '70px' : '0') : 'calc(50% - ' + (($scope.gameHeight - 70) / 2) + 'px)';
            return $scope.gameLaunchData === null || $scope.isFullscreen ? '0' : 'calc(50% - ' + ($scope.gameHeight / 2) + 'px)';
        };
        $scope.getGameRight = function () {
            return $scope.gameLaunchData === null || $scope.isFullscreen ? '0' : 'calc(50% - ' + ($scope.gameWidth / 2) + 'px)';
        };

        $scope.getActionsTop = function () {
            //return $scope.gameLaunchData === null || $scope.isFullscreen ? '0' : 'calc(50% + ' + (($scope.gameHeight + 70) / 2) + 'px)';
            return $scope.gameLaunchData === null || $scope.isFullscreen ? '0' : 'calc(50% + ' + ($scope.gameHeight / 2) + 'px)';
        };
        $scope.getActionsRight = function () {
            return $scope.gameLaunchData === null || $scope.isFullscreen ? '0' : 'calc(50% - ' + ($scope.gameWidth / 2) + 'px)';
        };

        $scope.getCloseTop = function () {
            //return $scope.gameLaunchData === null || $scope.isFullscreen ? '0' : 'calc(50% - ' + ((($scope.gameHeight - 70) / 2) + 18) + 'px)';
            return $scope.gameLaunchData === null || $scope.isFullscreen ? '0' : 'calc(50% - ' + (($scope.gameHeight / 2) + 18) + 'px)';
        };
        $scope.getCloseRight = function () {
            return $scope.gameLaunchData === null || $scope.isFullscreen ? '0' : 'calc(50% - ' + (($scope.gameWidth / 2) + 18) + 'px)';
        };

        $rootScope.playing = true;
    }
})();

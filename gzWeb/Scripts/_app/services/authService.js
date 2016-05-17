﻿(function () {
    'use strict';

    APP.factory('auth', ['$rootScope', '$http', '$q', '$location', '$route', 'emWamp', 'api', 'constants', 'localStorageService', 'helpers', 'vcRecaptchaService', authService]);

    function authService($rootScope, $http, $q, $location, $route, emWamp, api, constants, localStorageService, helpers, vcRecaptchaService) {
        var factory = {};

        // #region AuthData
        var noAuthData = {
            firstname: "",
            lastname: "",
            currency: "",
            username: "",
            token: "",
            roles: [constants.roles.guest],
            isGamer: false,
            isInvestor: false,
            isAdmin: false,
            isGuest: true
        };
        
        factory.readAuthData = function () {
            factory.data = localStorageService.get(constants.storageKeys.authData) || noAuthData;

            if ($location.path() === constants.routes.home.path) {
                if (factory.data.isGamer)
                    $location.path(constants.routes.games.path);
                else if (factory.data.isInvestor)
                    $location.path(constants.routes.summary.path);
            }
        }

        function storeAuthData() {
            localStorageService.set(constants.storageKeys.authData, factory.data);
        }

        function clearGamingData() {
            var gamerIndex = factory.data.roles.indexOf(constants.roles.gamer);
            if (gamerIndex > -1)
                factory.data.roles.splice(gamerIndex, 1);
            factory.data.isGamer = false;
            if (!factory.data.isInvestor) {
                factory.data.firstname = "";
                factory.data.lastname = "";
                factory.data.currency = "";
            }
            storeAuthData();
        }

        function clearInvestmentData() {
            var investorIndex = factory.data.roles.indexOf(constants.roles.investor);
            if (investorIndex > -1)
                factory.data.roles.splice(investorIndex, 1);
            factory.data.isInvestor = false;
            factory.data.username = "";
            factory.data.token = "";
            if (!factory.data.isGamer) {
                factory.data.firstname = "";
                factory.data.lastname = "";
                factory.data.currency = "";
            }
            storeAuthData();
        }
        // #endregion

        // #region SessionManagement
        function checkSessionInfo() {
            emWamp.getSessionInfo().then(function (sessionInfo) {
                if (sessionInfo.isAuthenticated) {
                    var gamerIndex = factory.data.roles.indexOf(constants.roles.gamer);
                    if (gamerIndex === -1)
                        factory.data.roles.push(constants.roles.gamer);
                    factory.data.isGamer = true;
                    factory.data.firstname = sessionInfo.firstname;
                    factory.data.lastname = sessionInfo.surname;
                    factory.data.currency = sessionInfo.currency;
                    storeAuthData();
                    $location.path(constants.routes.games.path);
                } else {
                    clearGamingData();
                    $location.path(constants.routes.home.path);
                }
                $rootScope.$broadcast(constants.events.AUTH_CHANGED);
            });
        }
        $rootScope.$on(constants.events.SESSION_STATE_CHANGE, function (event, args) {
            if (args.code === 0) {
                checkSessionInfo();
                $location.path(constants.routes.games.path);
            }
            else {
                // TODO Check all other codes
                clearGamingData();
                emWamp.init();
                $rootScope.$broadcast(constants.events.AUTH_CHANGED);
                $route.reload();
            }
        });
        // #endregion

        // #region Authorize
        factory.authorize = function (roles, mode) {
            if (roles) {
                var rolesArray = angular.isArray(roles) ? roles : roles.split(',');
                var contains = function (r) {
                    return factory.data.roles.indexOf(r) !== -1;
                }
                if (mode === 'all')
                    return helpers.array.all(rolesArray, contains);
                else if (mode === 'exact')
                    return factory.data.roles.length === rolesArray.length && helpers.array.all(rolesArray, contains);
                else
                    return helpers.array.any(rolesArray, contains);
            }
            else
                return false;
        };
        // #endregion

        // #region Logout
        factory.logout = function () {
            emWamp.logout();
            emWamp.init();
            checkSessionInfo();
            clearInvestmentData();
            $rootScope.$broadcast(constants.events.AUTH_CHANGED);

            // TODO
            //var templates = $filter('toArray')(constants.templates);
            //for (var i = 0; i < templates.length; i++)
            //    $templateCache.remove(templates[i]);
            //message.clear();
        }
        // #endregion

        // #region Login
        function gzLogin(usernameOrEmail, password) {
            var q = $q.defer();

            api.login(usernameOrEmail, password).then(function (gzLoginResult) {
                var investorIndex = factory.data.roles.indexOf(constants.roles.investor);
                if (investorIndex === -1)
                    factory.data.roles.push(constants.roles.investor);
                factory.data.isInvestor = true;
                factory.data.username = gzLoginResult.data.userName;
                factory.data.token = gzLoginResult.data.access_token;

                factory.data.firstname = gzLoginResult.data.firstname;
                factory.data.lastname = gzLoginResult.data.lastname;
                factory.data.currency = gzLoginResult.data.currency;
                storeAuthData();
                $rootScope.$broadcast(constants.events.AUTH_CHANGED);
                q.resolve(gzLoginResult);
            }, function (error) {
                q.reject(error.data.error_description);
            });
            return q.promise;
        }

        function emLogin(usernameOrEmail, password) {
            var q = $q.defer();
            emWamp.login({
                usernameOrEmail: usernameOrEmail,
                password: password
            }).then(function (emLoginResult) {
                q.resolve(emLoginResult);
            }, function (error) {
                q.reject(error ? error.desc : false);
            });
            return q.promise;
        }

        factory.login = function (usernameOrEmail, password) {
            var q = $q.defer();
            emLogin(usernameOrEmail, password).then(function (emLoginResult) {
                //for (var i = 0; i < emLoginResult.roles.length; i++)
                //    console.log("==========> EveryMatrix Role " + i + ": " + emLoginResult.roles[i]);
                //factory.data.push(emLoginResult.roles[i]);
                //storeAuthData();

                gzLogin(usernameOrEmail, password).then(function () {
                    $location.path(constants.routes.games.path);
                    q.resolve({ emLogin: true, gzLogin: true });
                }, function(gzLoginError) {
                    $location.path(constants.routes.games.path);
                    q.resolve({ emLogin: true, gzLogin: false, gzError: gzLoginError });
                });
            }, function (emLoginError) {
                gzLogin(usernameOrEmail, password).then(function () {
                    $location.path(constants.routes.summary.path);
                    q.resolve({ emLogin: false, emError: emLoginError, gzLogin: true });
                }, function (gzLoginError) {
                    q.resolve({ emLogin: false, emError: emLoginError, gzLogin: false, gzError: gzLoginError });
                });
            });
            return q.promise;
        }
        // #endregion

        // #region Register
        function emRegister(parameters) {
            return emWamp.register({
                username: parameters.username,
                email: parameters.email,
                alias: parameters.username,
                password: parameters.password,
                firstname: parameters.firstname,
                surname: parameters.lastname,
                birthDate: parameters.dateOfBirthFormatted,
                country: parameters.country,
                // TODO: region 
                // TODO: personalID 
                mobilePrefix: parameters.phonePrefix,
                mobile: parameters.phoneNumber,
                currency: parameters.currency,
                title: parameters.title,
                gender: parameters.gender,
                city: parameters.city,
                address1: parameters.address1,
                address2: parameters.address2,
                postalCode: parameters.postalCode,
                language: parameters.language,
                emailVerificationURL: parameters.emailVerificationURL,
                securityQuestion: parameters.securityQuestion,
                securityAnswer: parameters.securityAnswer
            });
        }

        function gzRegister(parameters) {
            return api.register({
                Username: parameters.username,
                Email: parameters.email,
                Password: parameters.password,
                FirstName: parameters.firstname,
                LastName: parameters.lastname,
                Birthday: parameters.dateOfBirth,
                Currency: parameters.currency,
                Title: parameters.title,
                Country: parameters.country,
                MobilePrefix: parameters.phonePrefix,
                Mobile: parameters.phoneNumber,
                City: parameters.city,
                Address: parameters.address1,
                PostalCode: parameters.postalCode,
                // TODO: Region ???
            });
        }

        factory.register = function (parameters) {
            var q = $q.defer();

            var revoke = function(error) {
                api.revokeRegistration().then(function () {
                    q.reject(error);
                }, function () {
                    q.reject(error);
                });
            }

            gzRegister(parameters).then(function (gzRegisterResult) {
                gzLogin(parameters.username, parameters.password).then(function (gzLoginResult) {
                    emRegister(parameters).then(function (emRegisterResult) {
                        emLogin(parameters.username, parameters.password).then(function (emLoginResult) {
                            q.resolve(true);
                        }, function (emLoginError) {
                            q.reject(emLoginError);
                        });
                    }, function (emRegisterError) {
                        revoke(emRegisterError.desc);
                    });
                }, function (gzLoginError) {
                    revoke(gzLoginError.desc);
                });
            }, function(gzRegisterError) {
                q.reject(gzRegisterError.data.Message);
            });

            return q.promise;
        }
        // #endregion

        // #region ForgotPassword
        factory.forgotPassword = function (email) {
            var q = $q.defer();
            api.forgotPassword(email).then(function (gzResetKey) {
                var changePwdUrl = $location.protocol() + "://" + $location.host();
                if ($location.port() > 0)
                    changePwdUrl += ":" + $location.port();

                changePwdUrl += "?";
                changePwdUrl += "email=";
                changePwdUrl += email;
                changePwdUrl += "gzKey=";
                changePwdUrl += gzResetKey.data;
                changePwdUrl += "&";
                changePwdUrl += "emKey=";

                emWamp.sendResetPwdEmail({
                    email: email,
                    changePwdURL: changePwdUrl,
                    captchaPublicKey: constants.reCaptchaPublicKey,
                    captchaChallenge: "",
                    captchaResponse: vcRecaptchaService.getResponse()
                }).then(function (result) {
                    q.resolve(true);
                }, function (error) {
                    vcRecaptchaService.reload();
                    q.reject(error.desc);
                });
            }, function (error) {
                vcRecaptchaService.reload();
                q.reject(error);
            });
        }
        // #endregion

        // #region ResetPassword
        factory.resetPassword = function (parameters) {
            var q = $q.defer();
            emWamp.resetPassword(parameters.emKey, parameters.password).then(function (emResetResult) {
                api.resetPassword({
                    Email: parameters.email,
                    Password: parameters.password,
                    ConfirmPassword: parameters.confirmPassword,
                    Code: parameters.gzKey
                }).then(function(gzResetResult) {
                    q.resolve(true);
                }, function(gzResetError) {
                    q.reject(gzResetError);
                });
            }, function (emResetError) {
                q.reject(emResetError.desc);
            });
            return q.promise;
        }
        // #endregion

        // #region ChangePassword
        factory.changePassword = function (oldPassword, newPassword, confirmPassword) {
            var q = $q.defer();
            emWamp.changePassword({
                oldPassword: oldPassword,
                newPassword: newPassword,
                captchaPublicKey: constants.reCaptchaPublicKey,
                captchaChallenge: "",
                captchaResponse: vcRecaptchaService.getResponse()
            }).then(function (emChangeResult) {
                api.changePassword({
                    OldPassword: oldPassword,
                    NewPassword: newPassword,
                    ConfirmPassword: confirmPassword
                }).then(function (gzChangeResult) {
                    q.resolve(true);
                }, function (gzChangeError) {
                    vcRecaptchaService.reload();
                    q.reject(gzChangeError);
                });
            }, function (emChangeError) {
                vcRecaptchaService.reload();
                q.reject(emChangeError.desc);
            });
            return q.promise;
        }
        // #endregion

        return factory;
    };
})();
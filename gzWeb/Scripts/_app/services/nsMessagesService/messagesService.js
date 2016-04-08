﻿(function () {
    'use strict';

    APP.factory('message', ['$rootScope', '$compile', '$q', serviceFactory]);
    function serviceFactory($rootScope, $compile, $q) {
        clear();

        var bodyElement = angular.element(document.querySelector('body>.non-footer'));
        var messagesElement = $compile('<ns-messages ns-modals="nsModals" ns-notifications="nsNotifications" ns-toastrs="nsToastrs"></ns-messages>')($rootScope);
        bodyElement.prepend(messagesElement);

        var services = {
            clear: clear,
            open: open,
            modal: modal,
            notify: notify,
            toastr: toastr,
            error: error,
            success: success,
            warning: warning,
            info: info,
            prompt: prompt,
            confirm: confirm,
            alert: alert
        }
        return services;

        function clear() {
            $rootScope.nsModals = [];
            $rootScope.nsNotifications = [];
            $rootScope.nsToastrs = [];
        }

        function open(options) {
            options = options || {};

            var deferred = $q.defer();
            var promise = deferred.promise;
            angular.extend(options, {
                nsResolve: deferred.resolve,
                nsReject: deferred.reject
            });

            if (options.nsType === 'modal')
                $rootScope.nsModals.push(options);
            else if (options.nsType === 'toastr')
                $rootScope.nsToastrs.splice(0, 0, options);
            else
                $rootScope.nsNotifications.splice(0, 0, options);
            return promise;
        }

        function modal(msg, options) {
            var defaults = {
                nsType: 'modal',
                nsTitle: msg
            };
            return open(angular.extend(defaults, options));
        }
        function notify(msg, options) {
            var defaults = {
                nsType: 'notification',
                //nsClass: 'info',
                nsTitle: msg.Message ? msg.Message : msg
            };
            return open(angular.extend(defaults, options));
        }
        function toastr(msg, options) {
            var defaults = {
                nsType: 'toastr',
                nsTitle: msg.Message ? msg.Message : msg
            };
            return open(angular.extend(defaults, options));
        }

        function error(msg, options) {
            function createErrorMsg(err) {
                if (err && err.Message) {
                    var errorElement = angular.element('<div></div>');
                    var errorMessageElement = angular.element('<h5></h5>');
                    errorMessageElement.append(err.Message);
                    errorElement.append(errorMessageElement);
                    if (err.MessageDetail) {
                        var errorMessageDetailElement = angular.element('<h6></h6>');
                        errorMessageDetailElement.append(err.MessageDetail);
                        errorElement.append(errorMessageDetailElement);
                    }
                    return errorElement[0].outerHTML;
                }
                else
                    return err;
            }
            var defaults = {
                nsClass: 'error',
                nsTitle: 'Error!',
                nsBody: createErrorMsg(msg),
                nsIconClass: 'fa-ban',
                nsSize: 'md',
                nsStatic: true
            };
            return modal(msg, angular.extend(defaults, options));
        }
        function success(msg, options) {
            var defaults = {
                nsClass: 'success',
                nsIconClass: 'fa-check',
                nsTitle: 'Success!',
                nsBody: msg,
                nsSize: 'sm'
            };
            return modal(msg, angular.extend(defaults, options));
        }
        function warning(msg, options) {
            var defaults = {
                nsClass: 'warning',
                nsIconClass: 'fa-exclamation-triangle',
                nsTitle: 'Warning!',
                nsBody: msg,
                nsSize: 'md'
            };
            return modal(msg, angular.extend(defaults, options));
        }
        function info(msg, options) {
            var defaults = {
                nsClass: 'info',
                nsIconClass: 'fa-bell',
                nsTitle: msg,
                nsSize: 'sm'
            };
            return notify(msg, angular.extend(defaults, options));
        }

        function prompt(msg, okCallBack, cancelCallback, options) {
            var defaults = {
                nsClass: 'prompt',
                nsIconClass: 'fa-question-circle',
                nsSize: 'md',
                nsPrompt: true,
                nsStatic: true
            };
            var promise = modal(msg, angular.extend(defaults, options));
            promise.then(okCallBack, cancelCallback);
        }
        function confirm(msg, okCallBack, cancelCallback, options) {
            var defaults = {
                nsTitle: msg,
                nsCtrl: 'confirmMessageCtrl',
                nsPromptButtons: [
                    { text: 'Cancel', eventKey: "cancel" },
                    { text: 'OK', eventKey: "ok" }
                ]
            };
            prompt(msg, okCallBack, cancelCallback, angular.extend(defaults, options));
        }
        function alert(msg, okCallBack, options) {
            var defaults = {
                nsIconClass: 'fa-exclamation-circle',
                nsPromptButtons: [
                    { text: 'OK', eventKey: "ok" }
                ]
            };
            confirm(msg, okCallBack, angular.noop, angular.extend(defaults, options));
        }
    };
})();


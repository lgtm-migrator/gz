﻿(function () {
    "use strict";
    var ctrlId = "changePasswordCtrl";
    APP.controller(ctrlId, ['$scope', 'constants', 'emWamp', 'api', 'message', 'vcRecaptchaService', ctrlFactory]);
    function ctrlFactory($scope, constants, emWamp, api, message, vcRecaptchaService) {
        $scope.spinnerGreen = constants.spinners.sm_rel_green;
        $scope.spinnerWhite = constants.spinners.sm_rel_white;
        $scope.reCaptchaPublicKey = constants.reCaptchaPublicKey;

        $scope.model = {
            oldPassword: undefined,
            newPassword: undefined,
            confirmPassword: undefined
        }
        
        // #region Password
        var _passwordPolicyRegEx = '';
        var _passwordPolicyError = '';

        function getPasswordPolicy() {
            emWamp.getPasswordPolicy().then(function (result) {
                _passwordPolicyRegEx = new RegExp(result.regularExpression);
                _passwordPolicyError = result.message;
            }, function(error) {
                console.log(error.desc);
            });
        };

        $scope.passwordValidation = {
            isValid: undefined,
            error: ''
        };
        $scope.validatePassword = function (password) {
            if (_passwordPolicyRegEx.test(password)) {
                $scope.passwordValidation.isValid = true;
            } else {
                $scope.passwordValidation.isValid = false;
                $scope.passwordValidation.error = _passwordPolicyError;
            };
        };
        $scope.onNewPasswordFocus = function () {
            $scope.newPasswordFocused = true;
        }
        $scope.onNewPasswordBlur = function () {
            $scope.newPasswordFocused = false;
            $scope.validatePassword($scope.model.newPassword);
        }

        $scope.passwordValidOnce = false;
        var unregisterIsPasswordValidWatch = $scope.$watch(function () {
            return $scope.form.newPassword.$dirty && $scope.form.newPassword.$valid && $scope.passwordValidation.isValid === true;
        }, function (newValue, oldValue) {
            if (newValue === true) {
                $scope.passwordValidOnce = true;
                unregisterIsPasswordValidWatch();
            }
        });
        // #endregion
        
        $scope.submit = function () {
            if ($scope.form.$valid)
                change();
        };
        function change(){
            $scope.waiting = true;
            emWamp.changePassword({
                oldPassword: $scope.model.oldPassword,
                newPassword: $scope.model.newPassword,
                captchaPublicKey: $scope.reCaptchaPublicKey,
                captchaChallenge: "",
                captchaResponse: vcRecaptchaService.getResponse()
            }).then(function (emResult) {
                api.changePassword({
                    OldPassword: $scope.model.oldPassword,
                    NewPassword: $scope.model.newPassword,
                    ConfirmPassword: $scope.model.confirmPassword
                }).then(function (gzResult) {
                    $scope.waiting = false;
                    message.toastr("Your password has been changed successfully!");
                    $scope.nsOk(true);
                }, function (error) {
                    $scope.waiting = false;
                    $scope.changePasswordError = error;
                });
            }, function(error) {
                $scope.waiting = false;
                $scope.changePasswordError = error.desc;
                vcRecaptchaService.reload();
            });
        }

        function init() {
            getPasswordPolicy();
        };
        init();
    }
})();
/**
 * Created by w_routg01 on 1/7/2017.
 */
siteInfo.currentApp.controller('profileController', ['$scope','$http','$rootScope','$routeParams','$location','authService', 'utilService','products','$uibModal', 'serverService','$timeout','ssoService',function ($scope,$http,$rootScope,$routeParams,$location, authService, utilService, products,$uibModal,serverService,$timeout,ssoService) {
    $rootScope.$broadcast('title', $scope.$locale.profile.page_title);
    if (utilService.isApp()) {
        $rootScope.$broadcast('hideHeader', true);
        $rootScope.$broadcast('hideContactUs', true);
    } else {
        $rootScope.$broadcast('hideContactUs',null);
    }

    $scope.uiModel = {
        profileUI: {
            profileUserItems: [
                {field:"firstName",label:$scope.$locale.profile.profile_general_firstName}
                ,{field:"lastName",label:$scope.$locale.profile.profile_general_lastName}
                ,{field:"tfaPhoneNumber",label:$scope.$locale.profile.profile_general_businessPhone}
                ,{field:"emailId",label:$scope.$locale.profile.profile_account_info_emailAddress}
                ,{field:"password",label:$scope.$locale.profile.profile_account_info_password}
                ,{field:"tfa",label:$scope.$locale.profile.tfa_authentication}
                ,{field:"lastLoginDate",label:$scope.$locale.profile.profile_account_info_lastLoginDate}
            ],
            adminList: [
                {field:"firstName",label:$scope.$locale.profile.profile_general_firstName}
                ,{field:"lastName",label:$scope.$locale.profile.profile_general_lastName}
                ,{field:"tfaPhoneNumber",label:$scope.$locale.profile.profile_general_businessPhone}
                ,{field:"emailId",label:$scope.$locale.profile.profile_account_info_emailAddress}
                ,{field:"lastLoginDate",label:$scope.$locale.profile.profile_account_info_lastLoginDate}
                ,{field:"password",label:$scope.$locale.profile.profile_account_info_password}
            ]
            ,standardUserItems: [
                {field:"firstName",label:$scope.$locale.profile.profile_general_firstName_su}
                ,{field:"tfaPhoneNumber",label:$scope.$locale.profile.profile_general_businessPhone}
                ,{field:"emailId",label:$scope.$locale.profile.profile_account_info_emailAddress}
                ,{field:"lastLoginDate",label:$scope.$locale.profile.profile_account_info_lastLoginDate}
                ,{field:"password",label:$scope.$locale.profile.profile_account_info_password}
                ,{field:"tfa",label:$scope.$locale.profile.tfa_authentication}
            ]
            ,accountILabelItems: [
                {field:"createDate",label:$scope.$locale.profile.profile_account_info_dateCreated}
                ,{field:"businessId",label:$scope.$locale.profile.profile_account_info_accountId}
                ,{field:"mediaConsultant",label:$scope.$locale.profile.profile_account_info_mediaConsultant}
            ]
        }
    };
    $scope.model = {
        ProfileDetailData: authService.getActiveAccount()
    };

    async function init(){
        try {
            const res = await $http({
                method: 'POST'
                , url: siteInfo.proxy + "sso/2fa/get-2fa-setup-default"
            })
            if(_.get(res,"data.UNKNOWN_ERROR"))
            {
                util.error(_.get(res,"data.UNKNOWN_ERROR"));
                return;
            }
            else
            {
                $scope.faSetup = _.get(res,"data");
                util.trace('$scope.faSetup:',$scope.faSetup);
                $scope.faSetupClone = _.cloneDeep($scope.faSetup);
            }
        }
        finally {
            $scope.$digest(); //force angularjs to reload the view
        }
    }
    init();

    /// get api for admin role//
    function _getUser() {
        return authService.getUser();
    }
    var userObj = _getUser();
    getUserListByIntegrationId();
    ////// Fetch User List /////////
    function fetchUserList() {
        if ($scope.isAdmin() || $scope.isReadOnlyUser()) {
            getAdminUserList();
        } else {
            if($rootScope.user.business.diadOnly) {
                $scope.standardUserList = $scope.getCurrentUser();
                return;
            }
            const businessIds = _.chain($scope.getCurrentUser()).get("businessIds", []).map("id").value();
            var businessId = $scope.getBusinessId();
            var url = "find-user-list-by-business-id-and-user-guid";
            var requestObj = {
                "userGuid": userObj.userGuid,
            };
            if (businessIds.length > 0 && _.includes(businessIds,  businessId)) {
                requestObj.businessId = businessId;
            } else {
                requestObj.integrationId = userObj.business.integrationId;
                url = "find-user-list-by-integration-id-and-user-guid";
            }
            getStandardUserList(url, requestObj);
        }
    }
    fetchUserList();
    //Get user list by integration id //
    $scope.userListByIntegartionId = [];
    function getUserListByIntegrationId(){
        var integrationId = userObj.business.integrationId;
        var requestObj = {
            "integrationId": integrationId
        };
        $http({
            method: 'POST'
            , url: siteInfo.proxy + "find-user-list-by-integration-id"
            , data: requestObj
        }).then(
            function (result) {
                $scope.integrationData = true;
                $scope.userListByIntegartionId = result.data.userDto;
                _.each($scope.userListByIntegartionId, function (item, index) {
                    $scope.userListByIntegartionId[index].isUserFromInegrationId = true;
                    if($scope.userListByIntegartionId[index].emailId == $rootScope.user.business.emailId){
                        $scope.userListByIntegartionId[index].currentLoginUser = true;
                    } else {
                        $scope.userListByIntegartionId[index].currentLoginUser = false;
                    }
                    if ($scope.userListByIntegartionId[index].integrationIds) {
                        $scope.userListByIntegartionId[index].admin = $scope.userListByIntegartionId[index].integrationIds[0].admin;
                    }
                });
                if($scope.businessData === false && $scope.integrationData && $rootScope.user.business.diadOnly === false){
                    $scope.adminUserList = $scope.userListByIntegartionId;
                }
                if(result.data.error){
                    $scope.userListByIntegartionId = [];
                    $scope.integrationData = false;
                }
            },
            function (err) {
                //error
            });
    }
    //getUserListByIntegrationId();
    // Get list of users for Admin //
    function getAdminUserList() {
        $scope.loader = true;
        var businessId = $scope.getBusinessId();
        var requestObj = {
            "businessId": businessId
        };
        $http({
            method: 'POST'
            , url: siteInfo.proxy + "find-user-list-by-business-id"
            , data: requestObj
        }).then(
            function (result) {
                $scope.loader = false;
                $scope.businessData = true;
                $scope.adminUserList = result.data.userDto;
                if($scope.adminUserList){
                _.each($scope.adminUserList, function (item,index) {
                    if ($scope.adminUserList[index].businessIds.length === 1) {
                        $scope.adminUserList[index].admin = $scope.adminUserList[index].businessIds[0].admin;
                    }
                    if ($scope.adminUserList[index].businessIds.length > 1) {
                        _.each($scope.adminUserList[index].businessIds, function (item, i) {
                            if ($scope.adminUserList[index].businessIds[i].id === $rootScope.user.business.id) {
                                $scope.adminUserList[index].admin = $scope.adminUserList[index].businessIds[i].admin;
                            }
                        });
                    }
                    if($scope.adminUserList[index].emailId == $rootScope.user.business.emailId){
                        $scope.adminUserList[index].currentLoginUser = true;
                    } else {
                        $scope.adminUserList[index].currentLoginUser = false;
                    }
                  });
                }
                if(result.data.error){
                    $scope.adminUserList = [];
                    $scope.businessData = false;
                }
                if($rootScope.user.business.diadOnly){
                    $scope.adminUserList.push($scope.getCurrentUser());
                    _.each($scope.adminUserList, function (item,index) {
                        if($scope.adminUserList[index].emailId == $rootScope.user.business.emailId){
                            $scope.adminUserList[index].currentLoginUser = true;
                        } else {
                            $scope.adminUserList[index].currentLoginUser = false;
                        }
                    })
                }
                //get unique users from integrationId
                $timeout(() => {
                    if ($scope.userListByIntegartionId) {
                        let uniqueUsers = $scope.userListByIntegartionId.filter(o1 => !$scope.adminUserList.some(o2 => o1.userGuid === o2.userGuid));
                        if (uniqueUsers) {
                            _.each(uniqueUsers, function (item, index) {
                                $scope.adminUserList.push(uniqueUsers[index]);
                            })
                        }
                    }
                }, 200)
            },
            function (err) {
                $scope.loader = false;
            }
        );
    }

    // get Standard User List //
    function getStandardUserList(url,requestObj) {
        $http({
            method: 'POST'
            , url: siteInfo.proxy + url
            , data: requestObj
        }).then(
            function (result) {
                if (result) {
                    $scope.standardUserList = result.data.userDto;
                }
            },
            function (err) {
            }
        );
    }
    function getInternaluserEmail() {
        var user = $rootScope.user;
        return _.get(user, 'internalUser.emailId') || '';
    }
 ///////////profileAddUser//////////////
    $scope.profileAddUser = function () {
        if ($scope.adminUserList.length < 100) {
            addUser();
        } else {
            addUserMaxLimitPopup();
        }
    }
    function addUser(){
        var modalInstance = $uibModal.open({
            animation: true,
            templateUrl: siteInfo.templatesUrl + 'profile/profile-adduser-modal.html',
            bindToController: true,
            backdrop: 'static',
            keyboard: false,
            controllerAs: '$ctrl',
            resolve: {
                data: function () {
                    return {};
                }
            },
            bindings: {
                firstName: '=',
                lastName: '=',
                email: '=',
                adminUserOnOff: '=',
                profileSuccess: '=',
                message: '=',
                userEditEmailDisabled:'='

            },
            controller: ["$uibModalInstance", "data", function ($uibModalInstance, data) {
                var $ctrl = this;
                $ctrl.$onInit = function () {
                    $ctrl.$locale = global_locale;
                    $ctrl.adminUserOnOff = false;
                    $ctrl.profileSuccess = false;
                };
                $ctrl.addUser = function () {
                    var businessId = $scope.getBusinessId();
                    var displayname = userObj.business.name;
                    var strMethod = displayname.split(" ");
                    var strDisplayName =  strMethod.join("") ;
                    var randomNumber = Math.floor(100000 + Math.random() * 900000);   
                    randomNumber = String(randomNumber);
                    var integrationId = userObj.business.integrationId;
                    var displayData = strDisplayName +randomNumber;
                    var btnSubmit = $("#profile-change-modal [type='submit']");
                    btnSubmit.loading(true);
                    var addUserObj = {
                        "firstName": $ctrl.firstName,
                        "lastName": $ctrl.lastName,
                        "emailId": $ctrl.email.toLocaleLowerCase(),
                        "displayName": displayData,
                        "businessId": businessId,
                        "integrationId": integrationId,
                        "admin": $ctrl.adminUserOnOff,
                        "source": "Dashboard",
                        "addedBy": $scope.isInternalUser()? getInternaluserEmail(): userObj.business.emailId
                    };
                    $http({
                        method: 'POST'
                        , url: siteInfo.proxy + "register-user-v2"
                        , data: addUserObj
                    }).then(
                        function (result) {
                            btnSubmit.loading(false);
                            if (result.data) {
                                $ctrl.profileSuccess = true;
                                $ctrl.message = result.data.userRegisteredToAccount;
                                if (result.data.userRegisteredToAccount) {
                                    getAdminUserList();
                                    addProfleUseriInNotificationContacts(addUserObj);
                                }
                                if (result.data.error) {
                                    $ctrl.message = result.data.error.message;
                                }
                            }
                        },
                        function (err) {
                        }
                    );
                }
                $ctrl.adminUser = function (adminUser) {
                    if (adminUser == "off") {
                        $ctrl.adminUserOnOff = true;
                    }
                    if (adminUser == "on") {
                        $ctrl.adminUserOnOff = false;
                    }
                }
                //email char validation after @
                $ctrl.validateEmailChar = function (inputEmail, form) {
                    $ctrl.frmAddForgot = form;
                    if (inputEmail) {
                        let email = inputEmail.split("@");
                        if (email[1].length > 255) {
                            $ctrl.frmAddForgot.$invalid = true;
                        }
                        else if(email[1].length <= 255 && $ctrl.firstName && $ctrl.lastName){
                            $ctrl.frmAddForgot.$invalid = false;
                        } else {
                            $ctrl.frmAddForgot.$invalid = true;
                        }
                    }
                }
                $ctrl.cancel = function () {
                    $uibModalInstance.dismiss({ $value: 'cancel' });
                };
            }]
        });

        modalInstance.result.then(function () {
            return null;
        }, function () {
        });
    }
    function addUserMaxLimitPopup() {
        $uibModal.open({
            animation: true,
            templateUrl: siteInfo.templatesUrl + 'profile/profile-adduser-modal.html',
            bindToController: true,
            backdrop: 'static',
            keyboard: false,
            controllerAs: '$ctrl',
            bindings: {
                userEditEmailDisabled: '='
            },
            resolve: {
                data: function () {
                    return {};
                }
            },
            controller: ["$uibModalInstance", "data", function ($uibModalInstance) {
                var $ctrl = this;
                $ctrl.$onInit = function () {
                    $ctrl.$locale = global_locale;
                    $ctrl.profileSuccess = true;
                    $ctrl.message = global_locale.profile.profile_adduser_maxlimit_msg;
                };
                $ctrl.cancel = function () {
                    $uibModalInstance.dismiss({ $value: 'cancel' });
                };
            }]
        });
    }

    ///////////profileEditUser//////////////
    $scope.profileEditUser = function (profileEditUserdata,show) {
        var modalInstance = $uibModal.open({
            animation: true,
            templateUrl: siteInfo.templatesUrl + 'profile/profile-edituser-modal.html',
            bindToController: true,
            backdrop: 'static',
            keyboard: false,
            controllerAs: '$ctrl',
            bindings: {
                userEditEmailDisabled:'='
            },
            resolve: {
                data: function () {
                    return {};
                }
            },
            controller: ["$uibModalInstance", "data", function ($uibModalInstance, data) {
                var $ctrl = this;
                $ctrl.$onInit = function () {
                    $ctrl.$locale = global_locale;
                    $ctrl.UserEditObject = angular.copy(profileEditUserdata);
                    $ctrl.userEditEmailDisabled = true;
                    $ctrl.type = show;
                };
                $ctrl.editUser = function () {
                    var businessId = $scope.getBusinessId();
                    var integrationId = userObj.business.integrationId;
                    var btnSubmit = $("#profile-change-modal [type='submit']");
                    btnSubmit.loading(true);
                    var updateUserObj = {
                        "userDto": {
                            "firstName": $ctrl.UserEditObject.firstName,
                            "lastName": $ctrl.UserEditObject.lastName,
                            "emailId": $ctrl.UserEditObject.emailId,
                            "userGuid": $ctrl.UserEditObject.userGuid,
                            "displayName": $ctrl.UserEditObject.displayName
                        },
                        "businessId": businessId,
                        "integrationId": integrationId,
                        "source": "Dashboard",
                        "modifiedBy": $scope.isInternalUser()? getInternaluserEmail(): userObj.business.emailId
                    };
                    if($ctrl.UserEditObject.isUserFromInegrationId){
                        updateUserObj.userDto.integrationIds = [{"id": integrationId,"admin": $ctrl.UserEditObject.admin}];
                    } else {
                        updateUserObj.userDto.businessIds = [{"id": businessId,"admin": $ctrl.UserEditObject.admin}];
                    }
                    $http({
                        method: 'POST'
                        , url: siteInfo.proxy + "update-user-v2"
                        , data: updateUserObj
                    }).then(
                        function (result) {
                            btnSubmit.loading(false);
                            $ctrl.profileSuccess = true;
                            if (result.data) {
                                $ctrl.profileSuccess = true;
                                if (result.data.updateSuccessful) {
                                    $ctrl.message = "User " + $ctrl.UserEditObject.emailId + " updated";
                                    updateUserNotificationContacts(result.data);
                                    getUserListByIntegrationId();
                                    fetchUserList();
                                } else if (!result.data.updateSuccessful) {
                                    $ctrl.message = "Something went wrong, user not updated.";
                                }
                                if (result.data.error) {
                                    $ctrl.message = result.data.error.message;
                                }
                            }
                        },
                        function (err) {
                        }
                    );
                }
                $ctrl.editAdminUser = function (adminUser) {
                    if (adminUser == "off") {
                        $ctrl.UserEditObject.admin = true;
                    }
                    if (adminUser == "on") {
                        $ctrl.UserEditObject.admin = false;
                    }
                }
                $ctrl.cancel = function () {
                    $uibModalInstance.dismiss({ $value: 'cancel' });
                };
            }]
        });
        modalInstance.result.then(function () {
            return null;
        }, function () {
        });
    }
    ///////////profileDeleteUser//////////////
    $scope.profileDeleteUser = function (deleteUserData) {
        var modalInstance = $uibModal.open({
            animation: true,
            templateUrl: siteInfo.templatesUrl + 'profile/profile-deleteuser-modal.html',
            bindToController: true,
            backdrop: 'static',
            keyboard: false,
            controllerAs: '$ctrl',
            resolve: {
                data: function () {
                    return {};
                }
            },
            controller: ["$uibModalInstance", "data", function ($uibModalInstance, data) {
                var $ctrl = this;
                $ctrl.$onInit = function () {
                    $ctrl.$locale = global_locale;
                    $ctrl.userDeleteObject = deleteUserData;
                };

                $ctrl.deleteUser = function () {
                    var businessId = $scope.getBusinessId();
                    var integrationId = userObj.business.integrationId;
                    var deleteUserObj = {
                        "userGuid": deleteUserData.userGuid,
                        "deletedBy": $scope.isInternalUser()? getInternaluserEmail(): userObj.business.emailId
                    };
                    if(deleteUserData.isUserFromInegrationId){
                        deleteUserObj.integrationId = integrationId;
                    } else {
                        deleteUserObj.businessId = businessId;
                    }
                    var btnSubmit = $("#profile-change-modal [type='submit']");
                    btnSubmit.loading(true);
                    $http({
                        method: 'POST'
                        , url: siteInfo.proxy + "delete-user-v2"
                        , data: deleteUserObj
                    }).then(
                        function (result) {
                            btnSubmit.loading(false);
                            $ctrl.profileSuccess = true;
                            if (result) {
                                if (result.data.deleteSuccessful) {
                                    $ctrl.message = "User " + deleteUserData.emailId + " deleted";
                                    deleteUserNotificationContacts(result.data);
                                } else if (!result.data.deleteSuccessful) {
                                    $ctrl.message = "Something went wrong, user not deleted.";
                                }
                                if (result.data.error) {
                                    $ctrl.message = result.error.message;
                                }
                            }
                            getAdminUserList();
                            getUserListByIntegrationId();
                        },
                        function (err) {
                        }
                    );
                }
                $ctrl.cancel = function () {
                    $uibModalInstance.dismiss({ $value: 'cancel' });
                };
            }]
        });
        modalInstance.result.then(function () {
            return null;
        }, function () {
        });
    }
    // Delete Notification Contacts //
    function deleteUserNotificationContacts(deleteUserData) {
        const deleteNotificationdata = {
            "email": deleteUserData.emailId,
            "deleted": deleteUserData.deleteSuccessful
        }
        $http({
            method: 'POST'
            , url: siteInfo.proxy + "delete-notification-contact"
            , data: deleteNotificationdata
        }).then(
            function (result) {
            })
    }

    // Update Notification Contacts //
    function updateUserNotificationContacts(updateUserData) {
        const updateNotificationData = {
            "email": updateUserData.emailId,
            "first_name": updateUserData.firstName,
            "last_name": updateUserData.lastName
        }
        $http({
            method: 'POST'
            , url: siteInfo.proxy + "update-notification-contact"
            , data: updateNotificationData
        }).then(
            function (result) {
            })
    }

    // Add Profile User in Notification Contacts collection//
    function addProfleUseriInNotificationContacts(userData) {
        var businessId = $scope.getBusinessId();
        const addProfileData = {
            "_id": "_" + (+(new Date())),
            "email": userData.emailId,
            "first_name": userData.firstName,
            "last_name": userData.lastName,
            "interested_in_notification": true,
            "primary_contact": false,
            "deleted": false,
            "businessID": businessId
        }
        $http({
            method: 'POST'
            , url: siteInfo.proxy + "add-notification-contact"
            , data: addProfileData
        }).then(
            function (result) {
            })
    }
}]);
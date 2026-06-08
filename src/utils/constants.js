// constants.js
// 由授权样本 com.xyhui v7.1.93 静态分析得到的基础配置。

export const WEB_VERSION = "7.10.0";
export const APP_VERSION = "7.1.93";
export const PC = "pc";

export const WEB_API_BASE_URL = "https://pocketuni.net";
export const MOBILE_API_BASE_URL = "https://apis.pocketuni.net";
export const CLASS_API_BASE_URL = "https://apis.pocketuni.net";
export const CLASS_WEB_BASE_URL = "https://class.pocketuni.net";
export const H5_BASE_URL = "https://h5.pocketuni.net";

// Legacy web API endpoints used by the existing Vue client.
export const LEGACY_ENDPOINTS = Object.freeze({
  loginQRCode: "/index.php?app=api&mod=Sitelist&act=loginQrcode",
  pollingLogin: "/index.php?app=api&mod=Sitelist&act=pollingLogin&0",
  login: "/index.php?app=api&mod=Sitelist&act=login",
  schools: "/index.php?app=api&mod=Sitelist&act=getSchools",
  pcUser: "/index.php?app=api&mod=Pc&act=pcUser",
  personalCenter: "/api/User/personalCenter",
  eventList: "/index.php?app=api&mod=Event&act=newEventList",
  eventDetail: "/index.php?app=api&mod=Event&act=queryActivityDetailById",
  joinEvent: "/index.php?app=api&mod=Event&act=join2",
  cancelEvent: "/index.php?app=api&mod=Event&act=cancelEvent",
  eventMemberList: "/index.php?app=api&mod=Event&act=eventMemberList",
  setSignManager: "/index.php?app=api&mod=Event&act=setSignManager",
  cancelSignManager: "/index.php?app=api&mod=Event&act=cancleSignManager",
  changeOrganiser: "/index.php?app=api&mod=Event&act=changeOrganiser",
  myEventList: "/index.php?app=api&mod=Event&act=myEventList",
  messages: "/api/message/lists",
});

// New Flutter app API strings extracted from lib/arm64-v8a/libapp.so.
export const APP_ENDPOINTS = Object.freeze({
  eventTags: "/apis/event/tag/data",
  eventRecommendList: "/apis/event/recommend/list",
  eventSearch: "/apis/event/search",
  eventCollectionList: "/apis/event/collection/list",
  eventRecord: "/apis/event/record",
  eventFeedback: "/apis/event/feedback",
  activityQrCodeTime: "/apis/activity/qrCode/time",
  activitySignResult: "/apis/activity/sign/result",
  activityMember: "/apis/activity/member",
  activityNewsList: "/apis/activity/news/list",
  activityNewsAdd: "/activity/news/add",
  activityEvaluateList: "/apis/activity/evaluate/list",
  activityEvaluateAdd: "/apis/activity/evaluate/add",
  activityVote: "/apis/activity/vote",
  activityVotePlayerList: "/apis/activity/vote/player/list",
  activityJoinMaterialInfo: "/activity/join-material/info",
  activityMidwayPrepStatus: "/apis/activity/midWay/prep/status",
  activityMidwaySign: "/apis/activity/midWay/sign",
  activityMidwaySignRecord: "/apis/activity/midWay/sign/record",
  activityCollectList: "/apis/activity/collect/list",
  activityCollectAdd: "/apis/activity/collect/add",
  activityCollectDel: "/apis/activity/collect/del",
  activityCanSignList: "/apis/activity/canSignList",
  activitySignIn: "/apis/activity/signIn",
  activitySignOut: "/apis/activity/signOut",
  activitySignInGps: "/apis/activity/signInGps",
  activitySignOutGps: "/apis/activity/signOutGps",
  activitySignInCode: "/apis/activity/signIn/activity/code",
  activitySignOutCode: "/apis/activity/signOut/activity/code",
  systemTime: "/apis/system/time",
  userResetPasswd: "/apis/user/reset-passwd",
  personalSendCode: "/apis/personal/send/code",
  inboxList: "/pu-app/api/v2/inbox/list",
  inboxInfo: "/pu-app/api/v2/inbox/interview/info",
  inboxFeedbacks: "/pu-app/api/v2/inbox/interview/feedbacks",
  activePhone: "/uc/active/phone",
  activeUsername: "/uc/active/username",
  activeCheckUsername: "/uc/active/check/username",
  activeVerificationCode: "/uc/active/verification/code",
});

// PC/class platform API endpoints extracted from https://class.pocketuni.net.
export const CLASS_ENDPOINTS = Object.freeze({
  schoolList: "/uc/school/list",
  login: "/uc/user/login",
  logout: "/uc/user/exit",
  loginQRCode: "/uc/user/qrcode",
  pollingLogin: "/uc/user/qrnotify",
  currentUser: "/uc/user/infocurr",
  forgotPasswordPhone: "/uc/user/phone",
  forgotPasswordSendCode: "/uc/user/send-code",
  forgotPasswordReset: "/uc/user/reset-password",
  pcUser: "/apis/user/pc-info",
  modules: "/apis/mapping/module",
  activityList: "/apis/activity/list",
  activityDetail: "/apis/activity/info",
  activityJoin: "/apis/activity/join",
  activityCancel: "/apis/activity/cancel",
  myActivityList: "/apis/activity/myList",
  myManageEventList: "/apis/myManageEvent/list",
  messages: "/apis/msg/list",
  homeIcon: "/apis/home/icon",
});

export const CLASS_X_SIGN_KEY = Object.freeze([
  121, 121, 0, 19, 5, 49, 2, 43, 13, 17, 11, 9, 4, 29, 60, 11,
]);

// Existing project compatibility secret for legacy web join endpoint only.
export const VUE_APP_ACTIVE_JOIN_SECRET = "s25ycjfxcehwzs60yookgq8fx1es05af";

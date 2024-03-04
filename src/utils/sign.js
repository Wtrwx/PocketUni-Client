// sign.js
import { MD5 } from 'crypto-js';
import * as Constants from '@/utils/constants.js';

export const joinSign = (uid, eventId, time) => {
    const text = `${uid}${eventId}${time}${Constants.VUE_APP_ACTIVE_JOIN_SECRET}`;
    const hashedData = MD5(text).toString().toLowerCase();
    return hashedData;
};

export const gpsSigninAndOutSign = (eventId, time) => {
    const text = `${eventId}${time}${Constants.ANDROID_GPS_SIGNIN_AND_OUT_SECRET}`;
    const hashedData = MD5(text).toString().toLowerCase();
    return hashedData;
};

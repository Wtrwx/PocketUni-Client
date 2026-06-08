// sign.js
import { MD5 } from "crypto-js";
import * as Constants from "@/utils/constants.js";

export const joinSign = (uid, eventId, time) => {
  const text = `${uid}${eventId}${time}${Constants.VUE_APP_ACTIVE_JOIN_SECRET}`;
  return MD5(text).toString().toLowerCase();
};

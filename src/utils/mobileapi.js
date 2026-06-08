// mobileapi.js

import * as Constants from "@/utils/constants.js";
import { normalizeApiError, postUrlEncoded, webClient } from "@/utils/http.js";

const request = async (task) => {
  try {
    return await task();
  } catch (error) {
    console.error(error);
    throw normalizeApiError(error);
  }
};

// Compatibility stub retained for old call sites.
export async function gpsSignInAndOut() {
  throw new Error("该操作当前不可用。");
}

export async function getMessage(oauth_token, oauth_token_secret, page, type) {
  return request(() =>
    postUrlEncoded(webClient, Constants.LEGACY_ENDPOINTS.messages, {
      oauth_token,
      oauth_token_secret,
      page,
      type,
    })
  );
}

// Deprecated legacy mobile login kept only for old call sites.
export async function login(username, password) {
  return request(() =>
    postUrlEncoded(webClient, Constants.LEGACY_ENDPOINTS.login, {
      password,
      client: 1,
      email: username,
    })
  );
}

export async function getPersonalInfo(oauth_token, oauth_token_secret) {
  return request(() =>
    postUrlEncoded(webClient, Constants.LEGACY_ENDPOINTS.personalCenter, {
      oauth_token,
      oauth_token_secret,
    })
  );
}

export async function newEventListWithRecomm(oauth_token, oauth_token_secret, page) {
  return request(() =>
    postUrlEncoded(webClient, "/index.php?app=api&mod=Event&act=newEventListWithRecomm", {
      oauth_token,
      oauth_token_secret,
      page,
    })
  );
}

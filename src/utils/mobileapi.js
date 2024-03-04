// mobileapi.js

import axios from "axios";
import { gpsSigninAndOutSign } from '@/utils/sign.js';

export async function gpsSignInAndOut(type, event_id, oauth_token, oauth_token_secret) {
  const time = Math.floor(Date.now());
  const signValue = gpsSigninAndOutSign(event_id, time);
  try {
    const response = await axios.post(
      "https://pocketuni.net/index.php?app=api&mod=Event&act=" + type,
      {
        event_id: event_id,
        oauth_token: oauth_token,
        oauth_token_secret: oauth_token_secret,
        sign: signValue,
        time: time,
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
      }
    );
    return response.data;

  } catch (error) {
    console.error(error)
    throw error;
  }
}

export async function getMessage(oauth_token, oauth_token_secret, page, type) {
  const data = new URLSearchParams();
  data.append('oauth_token', oauth_token);
  data.append('oauth_token_secret', oauth_token_secret);
  data.append('page', page);
  data.append('type', type);

  try {
    const response = await axios.post('https://pocketuni.net/api/message/lists', data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    })
    return response.data;

  } catch (error) {
    console.error(error)
    throw error;
  }
}

// 下面是废弃的api，已用web端api替代
export async function login(username, password) {
  try {
    const response = await axios.post(
      "https://pocketuni.net/index.php?app=api&mod=Sitelist&act=login",
      {
        password: password,
        client: 1,
        email: username,
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(error)
    throw error;
  }

}

export async function getPersonalInfo(oauth_token, oauth_token_secret) {
  try {
    const response = await axios.post(
      "https://pocketuni.net/api/User/personalCenter",
      {
        oauth_token: oauth_token,
        oauth_token_secret: oauth_token_secret,
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
      }
    );
    return response.data;

  } catch (error) {
    console.error(error)
    throw error;
  }
}

export async function newEventListWithRecomm(oauth_token, oauth_token_secret, page) {
  try {
    const response = await axios.post(
      "https://pocketuni.net/index.php?app=api&mod=Event&act=newEventListWithRecomm",
      {
        oauth_token: oauth_token,
        oauth_token_secret: oauth_token_secret,
        page: page,
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    return response.data;

  } catch (error) {
    console.error(error)
    throw error;
  }
}
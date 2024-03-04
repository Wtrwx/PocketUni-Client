// api.js

import axios from "axios";
import * as Constants from '@/utils/constants.js';
import { joinSign } from '@/utils/sign.js';

export async function getLoginQRCode() {
  try {
    const response = await axios.post(
      "https://pocketuni.net/index.php?app=api&mod=Sitelist&act=loginQrcode",
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

export async function pollingLogin(token) {
  try {
    const formData = `------WebKitFormBoundaryunB9TBB5lhbse3Tg\r\nContent-Disposition: form-data; name="token"\r\n\r\n${token}\r\n------WebKitFormBoundaryunB9TBB5lhbse3Tg--\r\n`;

    const response = await axios.post(
      "https://pocketuni.net/index.php?app=api&mod=Sitelist&act=pollingLogin&0",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data; boundary=----WebKitFormBoundaryunB9TBB5lhbse3Tg",
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function login(email, type, password, usernum, sid, school) {
  const headers = {
    'Content-Type': 'multipart/form-data; boundary=----WebKitFormBoundaryb0NPTnTFAkxEBASl',
  };
  const formData = new FormData();
  formData.append('email', email);
  formData.append('type', type);
  formData.append('password', password);
  formData.append('usernum', usernum);
  formData.append('sid', sid);
  formData.append('school', school);

  try {
    const response = await axios.post('https://pocketuni.net/index.php?app=api&mod=Sitelist&act=login', formData, { headers });
    console.log(response.data);
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function getSchools() {
  try {
    const response = await axios.get(
      "https://pocketuni.net/index.php?app=api&mod=Sitelist&act=getSchools",
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
export async function getPersonalBasicInfo(oauth_token, oauth_token_secret) {
  const formData = new FormData();
  formData.append('oauth_token', oauth_token);
  formData.append('oauth_token_secret', oauth_token_secret);
  formData.append('version', Constants.WEB_VERSION);
  formData.append('from', Constants.PC);

  try {
    const response = await axios.post('https://pocketuni.net/index.php?app=api&mod=Pc&act=pcUser', formData, {
      headers: {
        'Content-Type': 'multipart/form-data; boundary=----WebKitFormBoundarySsXBkABn0mZqMJ1o',
      },
    });
    return response.data;
  } catch (error) {
    console.error(error);
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

export async function newEventList(sid, keyword, url, page, oauth_token, oauth_token_secret) {
  try {
    const data = new FormData();
    data.append('from', Constants.PC);
    data.append('sid', sid);
    data.append('keyword', keyword);
    data.append('url', url);
    data.append('page', page);
    data.append('oauth_token', oauth_token);
    data.append('oauth_token_secret', oauth_token_secret);
    data.append('version', Constants.WEB_VERSION);

    const response = await axios.post('https://pocketuni.net/index.php?app=api&mod=Event&act=newEventList', data);
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function queryActivityDetailById(actiId, oauth_token, oauth_token_secret) {
  try {
    const formData = new FormData();
    formData.append('oauth_token', oauth_token);
    formData.append('oauth_token_secret', oauth_token_secret);
    formData.append('version', Constants.WEB_VERSION);
    formData.append('from', Constants.PC);

    const response = await axios.post(`https://pocketuni.net/index.php?app=api&mod=Event&act=queryActivityDetailById&from=${Constants.PC}&actiId=${actiId}`, formData);
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function joinEvent(uid, actiId, oauth_token, oauth_token_secret) {
  const time = Math.floor(Date.now() / 1000);
  const signValue = joinSign(uid, actiId, time);

  try {
    const formData = new FormData();
    formData.append("id", actiId);
    formData.append("time", time);
    formData.append("sign", signValue);
    formData.append("oauth_token", oauth_token);
    formData.append("oauth_token_secret", oauth_token_secret);
    formData.append("version", Constants.WEB_VERSION);
    formData.append("from", Constants.PC);

    const response = await axios.post("https://pocketuni.net/index.php?app=api&mod=Event&act=join2", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });

    return response.data;
  } catch (error) {

    console.error(error);
    throw error;
  }
}

export async function cancelEvent(actiId, oauth_token, oauth_token_secret) {

  try {
    const formData = new FormData();
    formData.append("id", actiId);
    formData.append("oauth_token", oauth_token);
    formData.append("oauth_token_secret", oauth_token_secret);
    formData.append("version", Constants.WEB_VERSION);
    formData.append("from", Constants.PC);

    const response = await axios.post("https://pocketuni.net/index.php?app=api&mod=Event&act=cancelEvent", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      }
    });

    return response.data;
  } catch (error) {

    console.error(error);
    throw error;
  }
}

export async function getMyEventList(oauth_token, oauth_token_secret, page, count) {

  try {
    const formData = new FormData();
    formData.append("oauth_token", oauth_token);
    formData.append("oauth_token_secret", oauth_token_secret);
    formData.append("version", Constants.WEB_VERSION);
    formData.append("from", Constants.PC);

    const response = await axios.post("https://pocketuni.net/index.php?app=api&mod=Event&act=myEventList&action=join&page=" + page + "&count=" + count + "&status=0&keyWord=", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      }
    });

    return response.data;
  } catch (error) {

    console.error(error);
    throw error;
  }
}
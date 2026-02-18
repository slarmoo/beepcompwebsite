import axios, { type AxiosInstance } from "axios";
import { APIToken, DiscordAccess, DiscordAuth } from "./persists";

class APIClass {
  host: string = import.meta.env.VITE_API_HOST;
  authorization?: string;
  _axios: AxiosInstance;
  constructor() {
    this._axios = axios.create({
      baseURL: this.host
    })
  }
  
  async _base_request(method: ("GET" | "POST" | "PATCH" | "PUT" | "DELETE"), url: string, data: object, dawg = false) {
    if (APIToken.value == "" && Object.keys(DiscordAuth.value).length > 0 && !dawg) {
      let this_res = await this._base_request("POST", "/login", DiscordAuth.value, true)
      if (!this_res.error) {
        APIToken.value = this_res
        DiscordAuth.value = {}
      }
    }
    
    let headers: any = {}
    if (APIToken.value != null) {
      this.authorization = APIToken.value
    }
    if (this.authorization != null) { headers["Authorization"] = `Bearer ${this.authorization}`}
    
    return new Promise<any>((reso, rej) => {
      print(`[API] ${method}: ${url}`, data)
      this._axios({ url, method, headers, data }).then(res => {
        reso(res.data)
      }).catch(reason => {
        print(reason)
        reso({
          status: reason?.status,
          error: (reason?.response?.data?.error || true)
        })
      })
    })
  }

  async GET(path: string, body: object = {}) {
    return this._base_request("GET", path, body)
  }

  async POST(path: string, body: object = {}) {
    return this._base_request("POST", path, body)
  }

  async PATCH(path: string, body: object = {}) {
    return this._base_request("PATCH", path, body)
  }

  async PUT(path: string, body: object = {}) {
    return this._base_request("PUT", path, body)
  }

  async DELETE(path: string, body: object = {}) {
    return this._base_request("DELETE", path, body)
  }

}

export const API = new APIClass();
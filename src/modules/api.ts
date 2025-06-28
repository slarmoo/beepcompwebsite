import axios, { type AxiosInstance } from "axios";
import { DiscordAccess } from "./persists";

class APIClass {
  host: string = import.meta.env.VITE_API_HOST;
  authorization?: string;
  _axios: AxiosInstance;
  constructor() {
    this._axios = axios.create({
      baseURL: this.host
    })
  }
  
  async _base_request(method: ("GET" | "POST" | "PATCH" | "PUT" | "DELETE"), url: string, data: object) {
    let headers: any = {}
    if (DiscordAccess.value != null) {
      this.authorization = DiscordAccess.value
    }
    if (this.authorization != null) { headers["Authorization"] = `Bearer ${this.authorization}`}
    
    return new Promise<any>((reso, rej) => {
      this._axios({ url, method, headers, data }).then(res => {
        reso(res.data)
      }).catch(reason => {
        print(reason)
        reso(reason?.response?.data)
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
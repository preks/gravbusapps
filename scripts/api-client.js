import axios from "axios";
import { v4 as uuidv4 } from "uuid";

/**
 * OAuth Client for handling authentication and token management
 */
class OAuthClient {
  constructor() {
    this.clientId = process.env.OAUTH_CLIENT_ID || "";
    this.clientSecret = process.env.OAUTH_CLIENT_SECRET || "";
    const keycloakHost =
      process.env.OAUTH_URL || "https://keycloak-dev.newwork.com";
    const realm = process.env.OAUTH_REALM || "newwork";
    this.tokenUrl = `${keycloakHost}/realms/${realm}/protocol/openid-connect/token`;
    this.accessToken = null;
    this.expiresAt = null; // epoch seconds

    if (!this.clientId || !this.clientSecret) {
      throw new Error("OAUTH_CLIENT_ID or OAUTH_CLIENT_SECRET not set");
    }
  }

  /**
   * Returns a valid access token, refreshing if needed
   * @returns {Promise<string>} The access token
   */
  async getAccessToken() {
    const now = Math.floor(Date.now() / 1000); // seconds since epoch

    // If token exists and is valid for at least 60 more seconds, use it
    if (this.accessToken && this.expiresAt && this.expiresAt - now > 60) {
      return this.accessToken;
    }

    try {
      const params = new URLSearchParams();
      params.append("grant_type", "client_credentials");
      params.append("client_id", this.clientId);
      params.append("client_secret", this.clientSecret);

      const response = await axios.post(this.tokenUrl, params.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      this.accessToken = response.data.access_token;
      // expires_in is in seconds
      this.expiresAt = now + response.data.expires_in;
      return this.accessToken;
    } catch (error) {
      console.error("Error fetching OAuth token:", error);
      throw new Error("Failed to obtain OAuth access token");
    }
  }
}

/**
 * Format path for resource URL
 * @param {string} path - The path to format
 * @returns {Object} Object containing the formatted code and name
 */
function formatPathForResource(path) {
  const segments = path.split("/");
  const code = segments.map((s) => s.toLowerCase()).join("-");
  const name = segments
    .map((s) => s.toLowerCase())
    .map((s) => `${s.charAt(0).toUpperCase()}${s.substring(1)}`)
    .join(" ");

  return { code, name };
}

/**
 * Add an app resource URL to Navigation service
 * @param {string} azureDestinationPath - The path where the app is deployed
 * @param {boolean} addIfExistsResponse - Whether to respond if the URL exists
 * @returns {Promise<void>}
 */
async function addAppResourceUrl(
  azureDestinationPath,
  addIfExistsResponse = true
) {
  try {
    const oauthClient = new OAuthClient();
    const accessToken = await oauthClient.getAccessToken();

    const { code, name } = formatPathForResource(azureDestinationPath);

    const payload = {
      code: code,
      name: name,
      url: `/platform/apps/${azureDestinationPath}`,
      roles: [],
      features: [],
      name_i18n: {},
      description_i18n: {},
      isSearchable: false,
    };

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_NAVIGATION_SERVICE_API}/resource-url`,
        payload,
        {
          headers: {
            accept: "application/json",
            authorization: `Bearer ${accessToken}`,
            "content-type": "application/json",
          },
        }
      );
      console.log(`✅ Resource URL added successfully: ${payload.url}`);
    } catch (error) {
      if (addIfExistsResponse) {
        console.log(
          `ℹ️ Possible Error. Or Resource URL already exists for: ${payload.url}`
        );
      }
    }
  } catch (error) {
    console.error("❌ Failed to add resource URL:", error.message);
    throw error;
  }
}

/**
 * Add a custom resource URL to Navigation service
 * @param {string} azureDestinationPath - The path where the app is deployed
 * @param {string} customUrlPath - The custom URL path provided by user
 * @returns {Promise<void>}
 */
async function addCustomResourceUrl(customUrlPath) {
  try {
    const oauthClient = new OAuthClient();
    const accessToken = await oauthClient.getAccessToken();

    const { code, name } = formatPathForResource(customUrlPath);

    const payload = {
      code: code,
      name: name,
      url: `/platform/${customUrlPath}`,
      roles: [],
      features: [],
      name_i18n: {},
      description_i18n: {},
      isSearchable: false,
    };

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_NAVIGATION_SERVICE_API}/resource-url`,
        payload,
        {
          headers: {
            accept: "application/json",
            authorization: `Bearer ${accessToken}`,
            "content-type": "application/json",
          },
        }
      );
      console.log(`✅ Custom resource URL added successfully: ${payload.url}`);
      return true;
    } catch (error) {
      console.log(
        `ℹ️ Possible Error. Or Custom resource URL migth already exist for: ${payload.url}`
      );
      return true;
    }
  } catch (error) {
    console.error("❌ Failed to add custom resource URL:", error.message);
    throw error;
  }
}

/**
 * Add screen configuration to Screen Management service
 * @param {string} azureDestinationPath - The path where the app is deployed
 * @param {string} customUrlPath - The custom URL path provided by user
 * @returns {Promise<void>}
 */
async function addScreenConfigToScreenManagement(
  azureDestinationPath,
  customUrlPath
) {
  try {
    const oauthClient = new OAuthClient();
    const accessToken = await oauthClient.getAccessToken();

    const { name } = formatPathForResource(customUrlPath);
    const screenKey = `url_${customUrlPath
      .split("/")
      .map((s) => s.toLowerCase())
      .join("~")}`;

    const payload = {
      id: uuidv4(),
      name: name,
      screenKey: screenKey,
      namespaceCode: "nw_dev",
      namespaceId: "1e6e2926-33f1-4dfb-a3b8-d535602d06b0",
      namespaceDescription: "nw_dev",
      type: "SCREEN",
      screenComponents: {
        appName: name,
        builderType: "NATIVE_SCREEN",
        key: screenKey,
        name: name,
        flowIcon: "",
        formDefinition: {
          componentPath: `/${azureDestinationPath}`,
          version: "",
        },
        release: false,
      },
    };

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_SCREEN_MANAGEMENT_SERVICE_API}/screen`,
        payload,
        {
          headers: {
            accept: "application/json",
            authorization: `Bearer ${accessToken}`,
            "content-type": "application/json",
          },
        }
      );
      console.log(`✅ Screen config added successfully for ${customUrlPath}`);
    } catch (error) {
      console.log(
        `ℹ️ Possible Error. Or Screen config already exists for ${customUrlPath}`
      );
    }
  } catch (error) {
    console.error("❌ Failed to add screen config:", error.message);
    throw error;
  }
}

export {
  OAuthClient,
  addAppResourceUrl,
  addCustomResourceUrl,
  addScreenConfigToScreenManagement,
};

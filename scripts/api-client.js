import axios from "axios";
import { v4 as uuidv4 } from "uuid";

/**
 * OAuth Client for handling authentication and token management
 */
class OAuthClient {
  constructor(config = {}) {
    this.clientId = config.clientId || process.env.OAUTH_CLIENT_ID || "";
    this.clientSecret = config.clientSecret || process.env.OAUTH_CLIENT_SECRET || "";
    const keycloakHost =
      config.oauthUrl || process.env.OAUTH_URL || "";
    const realm = config.realm || process.env.OAUTH_REALM || "";
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
 * @param {string} buildNumber - The build number to use as version (optional, defaults to empty string)
 * @param {string} apiEndpoint - The API endpoint to use (optional, defaults to dev endpoint)
 * @param {Object} oauthConfig - OAuth configuration for production (optional)
 * @returns {Promise<string|null>} The generated UUID if successful, null if failed
 */
async function addScreenConfigToScreenManagement(
  azureDestinationPath,
  customUrlPath,
  buildNumber = "",
  apiEndpoint = null,
  oauthConfig = {}
) {
  try {
    const oauthClient = new OAuthClient(oauthConfig);
    const accessToken = await oauthClient.getAccessToken();
    const screenManagementApi = apiEndpoint || process.env.NEXT_PUBLIC_SCREEN_MANAGEMENT_SERVICE_API;

    const { name } = formatPathForResource(customUrlPath);
    const screenKey = `url_${customUrlPath
      .split("/")
      .map((s) => s.toLowerCase())
      .join("~")}`;

    const generatedId = uuidv4();
    const payload = {
      id: generatedId,
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
          version: buildNumber,
        },
        release: buildNumber || false,
      },
    };

    try {
      await axios.post(
        `${screenManagementApi}/screen`,
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
      return generatedId;
    } catch (error) {
      console.log(
        `ℹ️ Possible Error. Or Screen config already exists for ${customUrlPath}`
      );
      return null;
    }
  } catch (error) {
    console.error("❌ Failed to add screen config:", error.message);
    throw error;
  }
}

/**
 * Update screen configuration in Screen Management service
 * @param {string} screenId - The ID of the screen to update
 * @param {Object} updateData - The screen data to update
 * @param {string} apiEndpoint - The API endpoint to use (optional, defaults to dev endpoint)
 * @param {Object} oauthConfig - OAuth configuration for production (optional)
 * @returns {Promise<boolean>} Whether the update was successful
 */
async function updateScreenConfigInScreenManagement(screenId, updateData, apiEndpoint = null, oauthConfig = {}) {
  try {
    const oauthClient = new OAuthClient(oauthConfig);
    const accessToken = await oauthClient.getAccessToken();
    const screenManagementApi = apiEndpoint || process.env.NEXT_PUBLIC_SCREEN_MANAGEMENT_SERVICE_API;

    // Ensure required fields are present
    const payload = {
      id: screenId,
      namespaceId: updateData.namespaceId || "1e6e2926-33f1-4dfb-a3b8-d535602d06b0",
      namespaceCode: updateData.namespaceCode || "nw_dev",
      screenKey: updateData.screenKey,
      name: updateData.name,
      namespaceDescription: updateData.namespaceDescription || "nw_dev",
      createdAt: updateData.createdAt,
      createdBy: updateData.createdBy,
      updatedBy: updateData.updatedBy,
      updatedAt: updateData.updatedAt || new Date().toISOString(),
      isDeleted: updateData.isDeleted || false,
      type: updateData.type || "SCREEN",
      screenComponents: {
        key: updateData.screenComponents?.key,
        name: updateData.screenComponents?.name,
        builderType: updateData.screenComponents?.builderType || "NATIVE_SCREEN",
        appId: updateData.screenComponents?.appId,
        appName: updateData.screenComponents?.appName,
        formDefinition: updateData.screenComponents?.formDefinition || {},
        flowIcon: updateData.screenComponents?.flowIcon || "",
        release: updateData.screenComponents?.release || false,
      },
    };

    try {
      await axios.put(
        `${screenManagementApi}/screen/${screenId}`,
        payload,
        {
          headers: {
            accept: "application/json",
            authorization: `Bearer ${accessToken}`,
            "content-type": "application/json",
          },
        }
      );
      console.log(`✅ Screen config updated successfully for ID: ${screenId}`);
      return true;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log(`❌ Screen config not found for ID: ${screenId}`);
      } else {
        console.log(`❌ Error updating screen config for ID: ${screenId}`, error.message);
      }
      return false;
    }
  } catch (error) {
    console.error("❌ Failed to update screen config:", error.message);
    throw error;
  }
}

/**
 * Convert camelCase to natural language with spaces
 * @param {string} camelCase - The camelCase string to convert
 * @returns {string} Natural language with spaces
 */
function camelCaseToNaturalLanguageWithWhiteSpaces(camelCase) {
  if (!camelCase) return "";

  // Replace camelCase with spaces and capitalize first letter
  const withSpaces = camelCase.replace(/([A-Z])/g, " $1").trim();
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

/**
 * Add form as a landing screen to Screen Management
 * @param {string} processName - Process name in camelCase
 * @param {string} azureDestinationPath - The path where the form is deployed
 * @param {string} buildNumber - The build number to use as version (optional, defaults to empty string)
 * @param {string} apiEndpoint - The API endpoint to use (optional, defaults to dev endpoint)
 * @param {Object} oauthConfig - OAuth configuration for production (optional)
 * @returns {Promise<string|null>} - The generated UUID if successful, null if failed
 */
async function addFormAsLandingScreen(processName, azureDestinationPath, buildNumber = "", apiEndpoint = null, oauthConfig = {}) {
  try {
    const oauthClient = new OAuthClient(oauthConfig);
    const accessToken = await oauthClient.getAccessToken();
    const screenManagementApi = apiEndpoint || process.env.NEXT_PUBLIC_SCREEN_MANAGEMENT_SERVICE_API;

    const name = camelCaseToNaturalLanguageWithWhiteSpaces(processName);
    const screenKey = `frm_${processName}`;

    const generatedId = uuidv4();
    const payload = {
      id: generatedId,
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
          version: buildNumber,
        },
        release: buildNumber || false,
      },
    };

    console.log(
      "📤 Posting form as landing screen to screen management API..."
    );

    try {
      // Similar pattern to existing API calls
      const response = await axios.post(`${screenManagementApi}/screen`, payload, {
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      console.log(
        `✅ Successfully added landing screen with ID: ${generatedId}`
      );
      return generatedId;
    } catch (apiError) {
      if (apiError.response && apiError.response.status === 409) {
        console.log("⚠️ Screen config already exists. Continuing...");
        return null;
      }
      throw apiError; // Re-throw to be caught by outer try-catch
    }
  } catch (error) {
    console.error(
      "❌ Failed to add landing screen to screen management:",
      error.message
    );
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
    return null;
  }
}

/**
 * Add form as a user task screen to Screen Management
 * @param {string} processName - Process name in camelCase
 * @param {string} taskName - Task name in camelCase
 * @param {string} azureDestinationPath - The path where the form is deployed
 * @param {string} buildNumber - The build number to use as version (optional, defaults to empty string)
 * @returns {Promise<string|null>} - The generated UUID if successful, null if failed
 */
async function addFormAsUserTaskScreen(
  processName,
  taskName,
  azureDestinationPath,
  buildNumber = ""
) {
  try {
    const oauthClient = new OAuthClient();
    const accessToken = await oauthClient.getAccessToken();
    const apiEndpoint = process.env.NEXT_PUBLIC_SCREEN_MANAGEMENT_SERVICE_API;

    const name1 = camelCaseToNaturalLanguageWithWhiteSpaces(processName);
    const name2 = camelCaseToNaturalLanguageWithWhiteSpaces(taskName);
    const name = `${name1} - ${name2}`;

    const screenKey = `frm_${processName}${
      taskName.charAt(0).toUpperCase() + taskName.slice(1)
    }`;

    const generatedId = uuidv4();
    const payload = {
      id: generatedId,
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
          version: buildNumber,
        },
        release: buildNumber || false,
      },
    };

    console.log(
      "📤 Posting form as user task screen to screen management API..."
    );

    try {
      // Similar pattern to existing API calls
      const response = await axios.post(`${apiEndpoint}/screen`, payload, {
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      console.log(
        `✅ Successfully added user task screen with ID: ${generatedId}`
      );
      return generatedId;
    } catch (apiError) {
      if (apiError.response && apiError.response.status === 409) {
        console.log("⚠️ Screen config already exists. Continuing...");
        return null;
      }
      throw apiError; // Re-throw to be caught by outer try-catch
    }
  } catch (error) {
    console.error(
      "❌ Failed to add user task screen to screen management:",
      error.message
    );
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
    return null;
  }
}

export {
  OAuthClient,
  addAppResourceUrl,
  addCustomResourceUrl,
  addScreenConfigToScreenManagement,
  updateScreenConfigInScreenManagement,
  addFormAsLandingScreen,
  addFormAsUserTaskScreen,
};

# Grafana Integration Guide - MADHUKAR Command Center

This document outlines the setup, architecture, and configuration required to map the MADHUKAR Command Center visualization panels to a running Grafana instance.

---

## Infrastructure Provisioning

> [!IMPORTANT]
> Grafana instance provisioning, plugin installation, and dashboard/panel creation must be done directly in the Grafana UI/admin — this is outside what a code agent can automate from within this repository. A running Grafana instance URL and either an API key/service account token or embed-enabled public dashboard links must be supplied via environment variables before these components will render real data.

### 1. Data Source Configuration
The MADHUKAR backend is powered by serverless Zoho Catalyst Cloud Functions, not a native SQL database.
To map live data to Grafana without setting up a secondary database sync:
- Install the **Infinity** data source plugin or the **JSON API** data source plugin on your Grafana instance.
- Configure a new data source pointing to the MADHUKAR REST APIs:
  - **Base URL**: The production backend host (e.g. `https://catalyst-backend-url/server/crime_api`)
  - **Authentication**: Set up headers as required by your environment context.

### 2. Endpoint Mapping & Template Variables
Each panel needs to be configured to query the existing REST endpoints. Below is the mapping contract:

| Visual Area | Grafana Dashboard / Panel ID | Backend REST Endpoint | Expected Params / Headers |
|---|---|---|---|
| **Command Center** (Dashboard) | `command_center`<br>Panel `1`: Registration vs Resolution Trend<br>Panel `2`: Workload Category Breakdown | `/api/dashboard` | `district`, `crimeType`, `dateRange` |
| **Crime Statistics Console** | `statistics`<br>Panel `1`: Long-term Line Trend<br>Panel `2`: Yearly comparison BarChart<br>Panel `3`: Day/Hour Heatmap Matrix<br>Panel `4`: Day of Week BarChart<br>Panel `5`: Spatial Hotspot Districts BarChart<br>Panel `6`: Grouped District Comparison | `/server/crime_api/api/statistics` | `district`, `crimeHead`, `dateRange` |
| **Predictions** | `predictions`<br>Panel `1`: Temporal Forecast AreaChart<br>Panel `2`: Forecast Category BarChart | `/api/predictions` | `district`, `crimeType`, `dateRange` |
| **Operational Intelligence Briefing** | `briefing`<br>Panel `1`: Weekly Caseload AreaChart<br>Panel `2`: Hour of Day BarChart<br>Panel `3`: Comparative District BarChart | `/api/reports` | `district`, `crimeType`, `dateRange` |

### 3. Required Dashboard Variables
To ensure the global filters in the React shell synchronize with your Grafana panels, you must declare the following template variables in the Dashboard Settings inside Grafana:

- **`district`**:
  - Name: `district`
  - Type: Query or Custom (containing district list or `all` fallback)
- **`crimehead`**:
  - Name: `crimehead`
  - Type: Query or Custom (containing major heads or `all` fallback)
- **`from`**:
  - Name: `from`
  - Type: Constant or text field (expects ISO date strings or Date fragments)
- **`to`**:
  - Name: `to`
  - Type: Constant or text field (expects ISO date strings or Date fragments)

---

## Environment Variables Configuration

In your `.env` or production deployment configuration, supply the following values:

```env
# The root URL of the running Grafana instance (used for panel frame embedding)
REACT_APP_GRAFANA_BASE_URL=https://your-grafana-domain.com

# Optional: Service Account Token or API Viewer-level token if required
REACT_APP_GRAFANA_API_KEY=glsa_your_viewer_token_here
```

---

## Security Redaction / Restricted Mode

When an officer is operating in Redacted/Restricted Mode (i.e. `session.accessLevel !== 'command'`), the embedding component will intercept render queries. It will automatically hide the interactive iframe and display a fallback notice block:

```
Restricted — detailed analytics unavailable in current mode
```

This prevents viewer-level embedding credentials from leaking detailed analytics when secure clearance is locked.

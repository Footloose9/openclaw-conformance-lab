# ACPX PR #1038 — captured and redacted shipped-CLI responses

The JSON below is taken directly from real compiled CLI process stdout and structurally redacted. It is not a reconstruction of expected values. All 13 captured responses and 24 step exit codes appear in the companion JSON artifact.

Reviewed commit: 613e95c641a623d51710b8ee7b3ad954b3ae66b4.
Published predecessor: acpx@0.22.0. Windows and Node 24.19.0. Synthetic ACP mock agent only.
Original private capture SHA-256: F39A291285B4A026D2BFF847866FED604BA4FE1CD17994246FF5C0D884C12210
Executed runner SHA-256: 2B1306CCACA4E4E8AE38C39B06D50CCD1ECF8676F01730A3FE03CB870942E921.
Source implementation is included under harness/acpx/shipped-cli-capture-r051.cjs; public code strengthens redaction only.

Three scenarios passed: 23 ordinary successful CLI commands and one intentional padded-value refusal. The unrelated Linux source qualification passed 18/18 regressions and complete upstream checks.

## Direct CLI preserves padded non-model value

CLI exit: 0

    {
      "action": "config_set",
      "configId": "reasoning_effort",
      "value": " high ",
      "resumed": false,
      "configOptions": [
        {
          "id": "mode",
          "name": "Session Mode",
          "category": "mode",
          "type": "select",
          "currentValue": "auto",
          "options": [
            {
              "value": "read-only",
              "name": "Read Only"
            },
            {
              "value": "auto",
              "name": "Default"
            },
            {
              "value": "full-access",
              "name": "Full Access"
            },
            {
              "value": "plan",
              "name": "Plan"
            },
            {
              "value": "default",
              "name": "Default"
            }
          ]
        },
        {
          "id": "model",
          "name": "Model",
          "category": "model",
          "type": "select",
          "currentValue": "default-model",
          "options": [
            {
              "value": "default-model",
              "name": "default-model"
            },
            {
              "value": "fast-model",
              "name": "fast-model"
            },
            {
              "value": "smart-model",
              "name": "smart-model"
            },
            {
              "value": "gpt-5.4",
              "name": "gpt-5.4"
            },
            {
              "value": "gpt-5.2",
              "name": "gpt-5.2"
            }
          ]
        },
        {
          "id": "reasoning_effort",
          "name": "Reasoning Effort",
          "category": "thought_level",
          "type": "select",
          "currentValue": " high ",
          "options": [
            {
              "value": "low",
              "name": "Low"
            },
            {
              "value": "medium",
              "name": "Medium"
            },
            {
              "value": "high",
              "name": "High"
            },
            {
              "value": "xhigh",
              "name": "Xhigh"
            }
          ]
        }
      ],
      "acpxRecordId": "<REDACTED>",
      "acpxSessionId": "<REDACTED>"
    }

## Direct CLI normalizes model

CLI exit: 0

    {
      "action": "model_set",
      "modelId": "fast-model",
      "resumed": false,
      "acpxRecordId": "<REDACTED>",
      "acpxSessionId": "<REDACTED>"
    }

## Published prior saved state

CLI exit: 0

    {
      "schema": "acpx.session.v1",
      "acpxRecordId": "<REDACTED>",
      "acpSessionId": "<REDACTED>",
      "agentCommand": "<REDACTED>",
      "agentArgv": "<REDACTED>",
      "cwd": "<REDACTED>",
      "name": "upgrade",
      "createdAt": "2026-11-19T04:46:12.234Z",
      "lastUsedAt": "2026-11-19T04:46:36.882Z",
      "lastSeq": 0,
      "eventLog": "<REDACTED>",
      "closed": false,
      "agentStartedAt": "2026-11-19T04:46:32.701Z",
      "lastAgentExitCode": null,
      "lastAgentExitSignal": null,
      "lastAgentExitAt": "2026-11-19T04:46:38.472Z",
      "lastAgentDisconnectReason": "connection_close",
      "protocolVersion": 1,
      "agentCapabilities": {
        "promptCapabilities": {
          "image": true,
          "audio": true,
          "embeddedContext": true
        }
      },
      "title": null,
      "messages": "<REDACTED>",
      "updated_at": "2026-11-19T04:46:12.234Z",
      "cumulative_token_usage": {},
      "request_token_usage": {},
      "acpx": {
        "session_origin": "new",
        "desired_config_options": {
          "reasoning_effort": "high"
        },
        "available_model_names": {
          "default-model": "default-model",
          "fast-model": "fast-model",
          "smart-model": "smart-model",
          "gpt-5.4": "gpt-5.4",
          "gpt-5.2": "gpt-5.2"
        },
        "current_model_id": "fast-model",
        "available_models": [
          "default-model",
          "fast-model",
          "smart-model",
          "gpt-5.4",
          "gpt-5.2"
        ],
        "model_control": "config_option",
        "config_options": [
          {
            "id": "mode",
            "name": "Session Mode",
            "category": "mode",
            "type": "select",
            "currentValue": "auto",
            "options": [
              {
                "value": "read-only",
                "name": "Read Only"
              },
              {
                "value": "auto",
                "name": "Default"
              },
              {
                "value": "full-access",
                "name": "Full Access"
              },
              {
                "value": "plan",
                "name": "Plan"
              },
              {
                "value": "default",
                "name": "Default"
              }
            ]
          },
          {
            "id": "model",
            "name": "Model",
            "category": "model",
            "type": "select",
            "currentValue": "fast-model",
            "options": [
              {
                "value": "default-model",
                "name": "default-model"
              },
              {
                "value": "fast-model",
                "name": "fast-model"
              },
              {
                "value": "smart-model",
                "name": "smart-model"
              },
              {
                "value": "gpt-5.4",
                "name": "gpt-5.4"
              },
              {
                "value": "gpt-5.2",
                "name": "gpt-5.2"
              }
            ]
          },
          {
            "id": "reasoning_effort",
            "name": "Reasoning Effort",
            "category": "thought_level",
            "type": "select",
            "currentValue": "high",
            "options": [
              {
                "value": "low",
                "name": "Low"
              },
              {
                "value": "medium",
                "name": "Medium"
              },
              {
                "value": "high",
                "name": "High"
              },
              {
                "value": "xhigh",
                "name": "Xhigh"
              }
            ]
          }
        ],
        "session_options": {
          "model": "fast-model"
        }
      }
    }

## Revised CLI reads prior saved state

CLI exit: 0

    {
      "schema": "acpx.session.v1",
      "acpxRecordId": "<REDACTED>",
      "acpSessionId": "<REDACTED>",
      "agentCommand": "<REDACTED>",
      "agentArgv": "<REDACTED>",
      "cwd": "<REDACTED>",
      "name": "upgrade",
      "createdAt": "2026-11-19T04:46:12.234Z",
      "lastUsedAt": "2026-11-19T04:46:36.882Z",
      "lastSeq": 0,
      "eventLog": "<REDACTED>",
      "closed": false,
      "agentStartedAt": "2026-11-19T04:46:32.701Z",
      "lastAgentExitCode": null,
      "lastAgentExitSignal": null,
      "lastAgentExitAt": "2026-11-19T04:46:38.472Z",
      "lastAgentDisconnectReason": "connection_close",
      "protocolVersion": 1,
      "agentCapabilities": {
        "promptCapabilities": {
          "image": true,
          "audio": true,
          "embeddedContext": true
        }
      },
      "title": null,
      "messages": "<REDACTED>",
      "updated_at": "2026-11-19T04:46:12.234Z",
      "cumulative_token_usage": {},
      "request_token_usage": {},
      "acpx": {
        "session_origin": "new",
        "desired_config_options": {
          "reasoning_effort": "high"
        },
        "available_model_names": {
          "default-model": "default-model",
          "fast-model": "fast-model",
          "smart-model": "smart-model",
          "gpt-5.4": "gpt-5.4",
          "gpt-5.2": "gpt-5.2"
        },
        "current_model_id": "fast-model",
        "available_models": [
          "default-model",
          "fast-model",
          "smart-model",
          "gpt-5.4",
          "gpt-5.2"
        ],
        "model_control": "config_option",
        "config_options": [
          {
            "id": "mode",
            "name": "Session Mode",
            "category": "mode",
            "type": "select",
            "currentValue": "auto",
            "options": [
              {
                "value": "read-only",
                "name": "Read Only"
              },
              {
                "value": "auto",
                "name": "Default"
              },
              {
                "value": "full-access",
                "name": "Full Access"
              },
              {
                "value": "plan",
                "name": "Plan"
              },
              {
                "value": "default",
                "name": "Default"
              }
            ]
          },
          {
            "id": "model",
            "name": "Model",
            "category": "model",
            "type": "select",
            "currentValue": "fast-model",
            "options": [
              {
                "value": "default-model",
                "name": "default-model"
              },
              {
                "value": "fast-model",
                "name": "fast-model"
              },
              {
                "value": "smart-model",
                "name": "smart-model"
              },
              {
                "value": "gpt-5.4",
                "name": "gpt-5.4"
              },
              {
                "value": "gpt-5.2",
                "name": "gpt-5.2"
              }
            ]
          },
          {
            "id": "reasoning_effort",
            "name": "Reasoning Effort",
            "category": "thought_level",
            "type": "select",
            "currentValue": "high",
            "options": [
              {
                "value": "low",
                "name": "Low"
              },
              {
                "value": "medium",
                "name": "Medium"
              },
              {
                "value": "high",
                "name": "High"
              },
              {
                "value": "xhigh",
                "name": "Xhigh"
              }
            ]
          }
        ],
        "session_options": {
          "model": "fast-model"
        }
      }
    }

## Revised CLI persists padded follow-up

CLI exit: 0

    {
      "schema": "acpx.session.v1",
      "acpxRecordId": "<REDACTED>",
      "acpSessionId": "<REDACTED>",
      "agentCommand": "<REDACTED>",
      "agentArgv": "<REDACTED>",
      "cwd": "<REDACTED>",
      "name": "upgrade",
      "createdAt": "2026-11-19T04:46:12.234Z",
      "lastUsedAt": "2026-11-19T04:46:48.157Z",
      "lastSeq": 0,
      "eventLog": "<REDACTED>",
      "closed": false,
      "agentStartedAt": "2026-11-19T04:46:45.288Z",
      "lastAgentExitCode": null,
      "lastAgentExitSignal": null,
      "lastAgentExitAt": "2026-11-19T04:46:49.421Z",
      "lastAgentDisconnectReason": "connection_close",
      "protocolVersion": 1,
      "agentCapabilities": {
        "promptCapabilities": {
          "image": true,
          "audio": true,
          "embeddedContext": true
        }
      },
      "title": null,
      "messages": "<REDACTED>",
      "updated_at": "2026-11-19T04:46:12.234Z",
      "cumulative_token_usage": {},
      "request_token_usage": {},
      "acpx": {
        "session_origin": "new",
        "desired_config_options": {
          "reasoning_effort": " high "
        },
        "available_model_names": {
          "default-model": "default-model",
          "fast-model": "fast-model",
          "smart-model": "smart-model",
          "gpt-5.4": "gpt-5.4",
          "gpt-5.2": "gpt-5.2"
        },
        "current_model_id": "fast-model",
        "available_models": [
          "default-model",
          "fast-model",
          "smart-model",
          "gpt-5.4",
          "gpt-5.2"
        ],
        "model_control": "config_option",
        "config_options": [
          {
            "id": "mode",
            "name": "Session Mode",
            "category": "mode",
            "type": "select",
            "currentValue": "auto",
            "options": [
              {
                "value": "read-only",
                "name": "Read Only"
              },
              {
                "value": "auto",
                "name": "Default"
              },
              {
                "value": "full-access",
                "name": "Full Access"
              },
              {
                "value": "plan",
                "name": "Plan"
              },
              {
                "value": "default",
                "name": "Default"
              }
            ]
          },
          {
            "id": "model",
            "name": "Model",
            "category": "model",
            "type": "select",
            "currentValue": "fast-model",
            "options": [
              {
                "value": "default-model",
                "name": "default-model"
              },
              {
                "value": "fast-model",
                "name": "fast-model"
              },
              {
                "value": "smart-model",
                "name": "smart-model"
              },
              {
                "value": "gpt-5.4",
                "name": "gpt-5.4"
              },
              {
                "value": "gpt-5.2",
                "name": "gpt-5.2"
              }
            ]
          },
          {
            "id": "reasoning_effort",
            "name": "Reasoning Effort",
            "category": "thought_level",
            "type": "select",
            "currentValue": " high ",
            "options": [
              {
                "value": "low",
                "name": "Low"
              },
              {
                "value": "medium",
                "name": "Medium"
              },
              {
                "value": "high",
                "name": "High"
              },
              {
                "value": "xhigh",
                "name": "Xhigh"
              }
            ]
          }
        ],
        "session_options": {
          "model": "fast-model"
        }
      }
    }

## Older owner refuses padded input

CLI exit: 1

    {
      "jsonrpc": "2.0",
      "id": null,
      "error": {
        "code": -32603,
        "message": "Running queue owner cannot preserve this CLI config value; wait for the older owner to exit, then retry without closing the session. Closing ends the session and requires creating a new one.",
        "data": {
          "acpxCode": "RUNTIME",
          "detailCode": "QUEUE_CLI_CONFIG_OWNER_UNSUPPORTED",
          "origin": "queue",
          "retryable": false,
          "sessionId": "<REDACTED>"
        }
      }
    }

## Older owner accepts plain legacy control

CLI exit: 0

    {
      "action": "config_set",
      "configId": "reasoning_effort",
      "value": "high",
      "resumed": false,
      "configOptions": [
        {
          "id": "mode",
          "name": "Session Mode",
          "category": "mode",
          "type": "select",
          "currentValue": "auto",
          "options": [
            {
              "value": "read-only",
              "name": "Read Only"
            },
            {
              "value": "auto",
              "name": "Default"
            },
            {
              "value": "full-access",
              "name": "Full Access"
            },
            {
              "value": "plan",
              "name": "Plan"
            },
            {
              "value": "default",
              "name": "Default"
            }
          ]
        },
        {
          "id": "model",
          "name": "Model",
          "category": "model",
          "type": "select",
          "currentValue": "default-model",
          "options": [
            {
              "value": "default-model",
              "name": "default-model"
            },
            {
              "value": "fast-model",
              "name": "fast-model"
            },
            {
              "value": "smart-model",
              "name": "smart-model"
            },
            {
              "value": "gpt-5.4",
              "name": "gpt-5.4"
            },
            {
              "value": "gpt-5.2",
              "name": "gpt-5.2"
            }
          ]
        },
        {
          "id": "reasoning_effort",
          "name": "Reasoning Effort",
          "category": "thought_level",
          "type": "select",
          "currentValue": "high",
          "options": [
            {
              "value": "low",
              "name": "Low"
            },
            {
              "value": "medium",
              "name": "Medium"
            },
            {
              "value": "high",
              "name": "High"
            },
            {
              "value": "xhigh",
              "name": "Xhigh"
            }
          ]
        }
      ],
      "acpxRecordId": "<REDACTED>",
      "acpxSessionId": "<REDACTED>"
    }

## Limits

The output is synthetic-adapter CLI data, not production-provider certification. Session identifiers, process identities, local paths, unrelated message contents, email addresses, credentials and endpoints were redacted. Maintainer acceptance of the mixed-version protocol remains a separate decision.

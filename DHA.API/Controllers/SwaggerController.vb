' =============================================
' Swagger UI Controller
' Serves interactive API documentation
' =============================================

Imports System.IO
Imports System.Net
Imports System.Net.Http
Imports System.Net.Http.Headers
Imports System.Text
Imports System.Web.Http

Namespace DHA.API.Controllers

    ''' <summary>
    ''' Serves Swagger UI and OpenAPI specification
    ''' </summary>
    <RoutePrefix("swagger")>
    Public Class SwaggerController
        Inherits ApiController

        ' =============================================
        ' GET /swagger - Swagger UI HTML page
        ' =============================================
        <Route("")>
        <HttpGet>
        <AllowAnonymous>
        Public Function GetSwaggerUI() As HttpResponseMessage
            Dim html As String = GenerateSwaggerUIHtml()

            Dim response As New HttpResponseMessage(HttpStatusCode.OK)
            response.Content = New StringContent(html, Encoding.UTF8, "text/html")
            Return response
        End Function

        ' =============================================
        ' GET /swagger/json - OpenAPI JSON specification
        ' =============================================
        <Route("json")>
        <HttpGet>
        <AllowAnonymous>
        Public Function GetSwaggerJson() As HttpResponseMessage
            Dim swaggerJson As String = GetSwaggerJsonContent()

            Dim response As New HttpResponseMessage(HttpStatusCode.OK)
            response.Content = New StringContent(swaggerJson, Encoding.UTF8, "application/json")
            Return response
        End Function

        ' =============================================
        ' GET /swagger/spec - Alias for JSON spec
        ' =============================================
        <Route("spec")>
        <HttpGet>
        <AllowAnonymous>
        Public Function GetSwaggerSpec() As HttpResponseMessage
            Return GetSwaggerJson()
        End Function

        ''' <summary>
        ''' Generates the Swagger UI HTML page
        ''' </summary>
        Private Function GenerateSwaggerUIHtml() As String
            Return "<!DOCTYPE html>
<html lang=""en"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>DHA ID Verification API - Documentation</title>
    <link rel=""stylesheet"" type=""text/css"" href=""https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css"">
    <style>
        html { box-sizing: border-box; overflow-y: scroll; }
        *, *:before, *:after { box-sizing: inherit; }
        body { margin: 0; background: #fafafa; }
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info { margin: 20px 0; }
        .swagger-ui .info .title { font-size: 2em; }
        .custom-header {
            background: linear-gradient(135deg, #1a5f2a 0%, #2d8b3f 100%);
            color: white;
            padding: 20px 40px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .custom-header h1 { margin: 0; font-size: 1.5em; }
        .custom-header .subtitle { opacity: 0.9; font-size: 0.9em; margin-top: 5px; }
        .custom-header .badge {
            background: rgba(255,255,255,0.2);
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 0.85em;
        }
        .api-key-notice {
            background: #fff3cd;
            border: 1px solid #ffc107;
            padding: 15px 40px;
            font-size: 0.9em;
        }
        .api-key-notice code {
            background: #e9ecef;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: monospace;
        }
    </style>
</head>
<body>
    <div class=""custom-header"">
        <div>
            <h1>DHA ID Verification API</h1>
            <div class=""subtitle"">W&RSETA Hackathon 2025 - DHA Mock API for Home Affairs Simulation</div>
        </div>
        <div class=""badge"">v1.1.0</div>
    </div>
    <div class=""api-key-notice"">
        <strong>Authentication:</strong> All endpoints require the <code>X-API-Key</code> header.
        Default key: <code>dha-api-key-2025</code>
    </div>
    <div id=""swagger-ui""></div>
    <script src=""https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js""></script>
    <script src=""https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js""></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle({
                url: '/swagger/json',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: 'StandaloneLayout',
                persistAuthorization: true,
                displayRequestDuration: true,
                filter: true,
                showExtensions: true,
                showCommonExtensions: true,
                requestInterceptor: (request) => {
                    // Auto-add API key if not present
                    if (!request.headers['X-API-Key']) {
                        request.headers['X-API-Key'] = 'dha-api-key-2025';
                    }
                    return request;
                }
            });
            window.ui = ui;
        };
    </script>
</body>
</html>"
        End Function

        ''' <summary>
        ''' Gets the OpenAPI JSON specification
        ''' </summary>
        Private Function GetSwaggerJsonContent() As String
            ' Try to load from file first
            Dim basePath As String = AppDomain.CurrentDomain.BaseDirectory
            Dim swaggerPath As String = Path.Combine(basePath, "..", "..", "swagger.json")

            If File.Exists(swaggerPath) Then
                Return File.ReadAllText(swaggerPath)
            End If

            ' Fallback: return embedded spec
            Return GetEmbeddedSwaggerSpec()
        End Function

        ''' <summary>
        ''' Returns embedded OpenAPI specification as fallback
        ''' </summary>
        Private Function GetEmbeddedSwaggerSpec() As String
            Return "{
  ""openapi"": ""3.0.3"",
  ""info"": {
    ""title"": ""DHA ID Verification API"",
    ""description"": ""DHA Mock API - Simulates South African Home Affairs ID Verification for W&RSETA Hackathon 2025"",
    ""version"": ""1.1.0"",
    ""contact"": {
      ""name"": ""API Support"",
      ""url"": ""https://github.com/tshekom8206/wrseta""
    }
  },
  ""servers"": [
    {
      ""url"": ""http://localhost:5000"",
      ""description"": ""Local Development Server""
    }
  ],
  ""paths"": {
    ""/api/health"": {
      ""get"": {
        ""tags"": [""Health""],
        ""summary"": ""Basic health check"",
        ""responses"": {
          ""200"": { ""description"": ""API is healthy"" }
        }
      }
    },
    ""/api/health/detailed"": {
      ""get"": {
        ""tags"": [""Health""],
        ""summary"": ""Detailed health check with database status"",
        ""responses"": {
          ""200"": { ""description"": ""Health status with database connectivity"" }
        }
      }
    },
    ""/api/telemetry/metrics"": {
      ""get"": {
        ""tags"": [""Telemetry""],
        ""summary"": ""Get telemetry metrics"",
        ""responses"": {
          ""200"": { ""description"": ""Current telemetry metrics"" }
        }
      }
    },
    ""/api/telemetry/status"": {
      ""get"": {
        ""tags"": [""Telemetry""],
        ""summary"": ""Get telemetry configuration status"",
        ""responses"": {
          ""200"": { ""description"": ""Telemetry configuration"" }
        }
      }
    },
    ""/api/dha/verify"": {
      ""post"": {
        ""tags"": [""DHA Verification""],
        ""summary"": ""Simulate DHA ID verification"",
        ""description"": ""Verifies a South African ID number against the mock DHA database. Only requires ID number - no name validation."",
        ""requestBody"": {
          ""required"": true,
          ""content"": {
            ""application/json"": {
              ""schema"": {
                ""type"": ""object"",
                ""required"": [""idNumber""],
                ""properties"": {
                  ""idNumber"": {
                    ""type"": ""string"",
                    ""description"": ""13-digit South African ID number"",
                    ""example"": ""9001015801085""
                  },
                  ""firstName"": {
                    ""type"": ""string"",
                    ""description"": ""First name (ignored in verification)""
                  },
                  ""surname"": {
                    ""type"": ""string"",
                    ""description"": ""Surname (ignored in verification)""
                  }
                }
              }
            }
          }
        },
        ""responses"": {
          ""200"": {
            ""description"": ""Verification result"",
            ""content"": {
              ""application/json"": {
                ""schema"": {
                  ""$ref"": ""#/components/schemas/DHAVerificationResponse""
                }
              }
            }
          },
          ""400"": { ""description"": ""Invalid request or ID format"" }
        }
      }
    },
    ""/api/dha/status"": {
      ""get"": {
        ""tags"": [""DHA Verification""],
        ""summary"": ""Get DHA service status"",
        ""description"": ""Returns DHA service status and circuit breaker information"",
        ""responses"": {
          ""200"": { ""description"": ""Service status information"" }
        }
      }
    },
    ""/api/dha/verify-batch"": {
      ""post"": {
        ""tags"": [""DHA Verification""],
        ""summary"": ""Bulk DHA verification"",
        ""description"": ""Verify multiple ID numbers in a single request (up to 100 IDs)"",
        ""requestBody"": {
          ""required"": true,
          ""content"": {
            ""application/json"": {
              ""schema"": {
                ""type"": ""object"",
                ""required"": [""idNumbers""],
                ""properties"": {
                  ""idNumbers"": {
                    ""type"": ""array"",
                    ""items"": {
                      ""type"": ""string""
                    },
                    ""maxItems"": 100,
                    ""description"": ""Array of ID numbers to verify""
                  }
                }
              }
            }
          }
        },
        ""responses"": {
          ""200"": { ""description"": ""Bulk verification results"" },
          ""400"": { ""description"": ""Invalid request or batch too large"" }
        }
      }
    },
    ""/api/dha/data/add-person"": {
      ""post"": {
        ""tags"": [""DHA Data Management""],
        ""summary"": ""Add a person to DHA mock database"",
        ""description"": ""Adds a new person record to the DHA mock database"",
        ""requestBody"": {
          ""required"": true,
          ""content"": {
            ""application/json"": {
              ""schema"": {
                ""$ref"": ""#/components/schemas/AddPersonRequest""
              }
            }
          }
        },
        ""responses"": {
          ""200"": { ""description"": ""Person added successfully"" },
          ""400"": { ""description"": ""Invalid request or validation error"" },
          ""409"": { ""description"": ""Person with this ID number already exists"" }
        }
      }
    },
    ""/api/dha/data/add-sample-data"": {
      ""post"": {
        ""tags"": [""DHA Data Management""],
        ""summary"": ""Add sample data to database"",
        ""description"": ""Generates and adds sample people to the DHA mock database"",
        ""parameters"": [
          {
            ""name"": ""count"",
            ""in"": ""query"",
            ""description"": ""Number of sample records to generate (1-100)"",
            ""required"": false,
            ""schema"": {
              ""type"": ""integer"",
              ""minimum"": 1,
              ""maximum"": 100,
              ""default"": 10
            }
          }
        ],
        ""responses"": {
          ""200"": { ""description"": ""Sample data added successfully"" },
          ""400"": { ""description"": ""Invalid count parameter"" }
        }
      }
    },
    ""/api/dha/data/person/{idNumber}"": {
      ""get"": {
        ""tags"": [""DHA Data Management""],
        ""summary"": ""Get person by ID number"",
        ""description"": ""Retrieves person information from the DHA mock database"",
        ""parameters"": [
          {
            ""name"": ""idNumber"",
            ""in"": ""path"",
            ""required"": true,
            ""schema"": {
              ""type"": ""string""
            },
            ""description"": ""13-digit South African ID number""
          }
        ],
        ""responses"": {
          ""200"": { ""description"": ""Person found"" },
          ""404"": { ""description"": ""Person not found"" }
        }
      }
    },
    ""/api/dha/data/test-connection"": {
      ""get"": {
        ""tags"": [""DHA Data Management""],
        ""summary"": ""Test database connection"",
        ""description"": ""Tests connectivity to the DHA mock database"",
        ""responses"": {
          ""200"": { ""description"": ""Database connection successful"" },
          ""503"": { ""description"": ""Database connection failed"" }
        }
      }
    }
  },
  ""components"": {
    ""schemas"": {
      ""DHAVerificationResponse"": {
        ""type"": ""object"",
        ""properties"": {
          ""success"": { ""type"": ""boolean"", ""description"": ""Whether the verification request was successful"" },
          ""verified"": { ""type"": ""boolean"", ""description"": ""Whether the ID was verified"" },
          ""status"": {
            ""type"": ""string"",
            ""enum"": [""VERIFIED"", ""NOT_FOUND"", ""SERVICE_ERROR"", ""PENDING_REVIEW"", ""SUSPENDED"", ""VERIFIED_DECEASED"", ""INVALID_FORMAT""],
            ""description"": ""Verification status""
          },
          ""message"": { ""type"": ""string"", ""description"": ""Human-readable message"" },
          ""firstName"": { ""type"": ""string"", ""description"": ""First name from DHA records"" },
          ""surname"": { ""type"": ""string"", ""description"": ""Surname from DHA records"" },
          ""dateOfBirth"": { ""type"": ""string"", ""format"": ""date"", ""description"": ""Date of birth"" },
          ""gender"": { ""type"": ""string"", ""enum"": [""Male"", ""Female""], ""description"": ""Gender"" },
          ""citizenship"": { ""type"": ""string"", ""enum"": [""SA Citizen"", ""Permanent Resident""], ""description"": ""Citizenship status"" },
          ""isDeceased"": { ""type"": ""boolean"", ""description"": ""Whether the person is deceased"" },
          ""dateOfDeath"": { ""type"": ""string"", ""format"": ""date-time"", ""nullable"": true, ""description"": ""Date of death if deceased"" },
          ""errorCode"": { ""type"": ""string"", ""nullable"": true, ""description"": ""Error code if verification failed"" },
          ""errorMessage"": { ""type"": ""string"", ""nullable"": true, ""description"": ""Error message if verification failed"" },
          ""needsManualReview"": { ""type"": ""boolean"", ""description"": ""Whether manual review is required"" },
          ""verificationDate"": { ""type"": ""string"", ""format"": ""date-time"", ""nullable"": true, ""description"": ""Date and time of verification"" },
          ""verificationReference"": { ""type"": ""string"", ""nullable"": true, ""description"": ""Verification reference number"" },
          ""processingTimeMs"": { ""type"": ""integer"", ""description"": ""Processing time in milliseconds"" },
          ""timestamp"": { ""type"": ""string"", ""format"": ""date-time"", ""description"": ""Response timestamp"" },
          ""requestId"": { ""type"": ""string"", ""description"": ""Request correlation ID"" }
        }
      },
      ""AddPersonRequest"": {
        ""type"": ""object"",
        ""required"": [""idNumber"", ""firstName"", ""surname"", ""dateOfBirth"", ""gender"", ""citizenship""],
        ""properties"": {
          ""idNumber"": { ""type"": ""string"", ""minLength"": 13, ""maxLength"": 13, ""description"": ""13-digit South African ID number"", ""example"": ""9001015801085"" },
          ""firstName"": { ""type"": ""string"", ""description"": ""First name"" },
          ""surname"": { ""type"": ""string"", ""description"": ""Surname"" },
          ""dateOfBirth"": { ""type"": ""string"", ""format"": ""date"", ""description"": ""Date of birth"" },
          ""gender"": { ""type"": ""string"", ""enum"": [""Male"", ""Female""], ""description"": ""Gender"" },
          ""citizenship"": { ""type"": ""string"", ""enum"": [""SA Citizen"", ""Permanent Resident""], ""description"": ""Citizenship status"" },
          ""isDeceased"": { ""type"": ""boolean"", ""default"": false, ""description"": ""Whether the person is deceased"" },
          ""dateOfDeath"": { ""type"": ""string"", ""format"": ""date"", ""nullable"": true, ""description"": ""Date of death if deceased"" },
          ""isSuspended"": { ""type"": ""boolean"", ""default"": false, ""description"": ""Whether the ID is suspended"" },
          ""suspensionReason"": { ""type"": ""string"", ""nullable"": true, ""description"": ""Reason for suspension"" },
          ""needsManualReview"": { ""type"": ""boolean"", ""default"": false, ""description"": ""Whether manual review is required"" },
          ""reviewReason"": { ""type"": ""string"", ""nullable"": true, ""description"": ""Reason for manual review"" }
        }
      },
      ""ApiResponse"": {
        ""type"": ""object"",
        ""properties"": {
          ""success"": { ""type"": ""boolean"" },
          ""data"": { ""description"": ""Response data"" },
          ""error"": {
            ""type"": ""object"",
            ""properties"": {
              ""code"": { ""type"": ""string"" },
              ""message"": { ""type"": ""string"" }
            }
          },
          ""timestamp"": { ""type"": ""string"", ""format"": ""date-time"" },
          ""requestId"": { ""type"": ""string"" }
        }
      }
    },
    ""securitySchemes"": {
      ""ApiKeyAuth"": {
        ""type"": ""apiKey"",
        ""in"": ""header"",
        ""name"": ""X-API-Key"",
        ""description"": ""API Key authentication. Include in header as X-API-Key: your-key""
      },
      ""BearerAuth"": {
        ""type"": ""http"",
        ""scheme"": ""bearer"",
        ""bearerFormat"": ""JWT"",
        ""description"": ""JWT Bearer token authentication""
      }
    }
  },
  ""security"": [
    { ""ApiKeyAuth"": [] }
  ]
}"
        End Function

    End Class

End Namespace

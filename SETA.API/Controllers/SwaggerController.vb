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

Namespace Controllers

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
    <title>SETA ID Verification API - Documentation</title>
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
            <h1>SETA ID Verification API</h1>
            <div class=""subtitle"">W&RSETA Hackathon 2025 - Multi-SETA Duplicate Detection System</div>
        </div>
        <div class=""badge"">v1.1.0</div>
    </div>
    <div class=""api-key-notice"">
        <strong>Authentication:</strong> All endpoints require the <code>X-API-Key</code> header.
        Test key: <code>wrseta-lms-key-2025</code> |
        JWT endpoints also require <code>Authorization: Bearer {token}</code>
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
                        request.headers['X-API-Key'] = 'wrseta-lms-key-2025';
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
    ""title"": ""SETA ID Verification API"",
    ""description"": ""Multi-SETA ID Verification & Duplicate Detection System for W&RSETA Hackathon 2025"",
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
    ""/api/auth/token"": {
      ""post"": {
        ""tags"": [""Authentication""],
        ""summary"": ""Get JWT token"",
        ""requestBody"": {
          ""content"": {
            ""application/json"": {
              ""schema"": {
                ""type"": ""object"",
                ""properties"": {
                  ""username"": { ""type"": ""string"" },
                  ""password"": { ""type"": ""string"" },
                  ""setaId"": { ""type"": ""integer"" }
                }
              }
            }
          }
        },
        ""responses"": {
          ""200"": { ""description"": ""Token generated"" },
          ""401"": { ""description"": ""Invalid credentials"" }
        }
      }
    },
    ""/api/verification/verify"": {
      ""post"": {
        ""tags"": [""Verification""],
        ""summary"": ""Verify SA ID number"",
        ""requestBody"": {
          ""content"": {
            ""application/json"": {
              ""schema"": {
                ""type"": ""object"",
                ""properties"": {
                  ""idNumber"": { ""type"": ""string"" },
                  ""firstName"": { ""type"": ""string"" },
                  ""surname"": { ""type"": ""string"" }
                }
              }
            }
          }
        },
        ""responses"": {
          ""200"": { ""description"": ""Verification result (GREEN/YELLOW/RED)"" }
        }
      }
    },
    ""/api/setas"": {
      ""get"": {
        ""tags"": [""SETAs""],
        ""summary"": ""List all 21 SETAs"",
        ""responses"": {
          ""200"": { ""description"": ""List of SETAs"" }
        }
      }
    }
  },
  ""components"": {
    ""securitySchemes"": {
      ""ApiKeyAuth"": {
        ""type"": ""apiKey"",
        ""in"": ""header"",
        ""name"": ""X-API-Key""
      },
      ""BearerAuth"": {
        ""type"": ""http"",
        ""scheme"": ""bearer"",
        ""bearerFormat"": ""JWT""
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

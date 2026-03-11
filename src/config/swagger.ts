import swaggerJSDoc from "swagger-jsdoc";

export const createSwaggerSpec = () => {
  const port = process.env.PORT || 4000;
  const serverUrl = process.env.SWAGGER_SERVER_URL || `http://localhost:${port}`;

  const apis = process.env.NODE_ENV === "production" ? ["./dist/**/*.js"] : ["./src/**/*.ts"];

  return swaggerJSDoc({
    definition: {
      openapi: "3.0.0",
      info: {
        title: "El Resort Extras API",
        version: "1.0.0",
        description: "Backend base para reserva de extras",
      },
      servers: [{ url: serverUrl }],
      tags: [
        { name: "Auth", description: "Autenticación y usuario" },
        { name: "Extras", description: "Gestión de extras" },
        { name: "Reservations", description: "Reservas (Cloudbeds)" },
        { name: "CustomFields", description: "Custom fields (Cloudbeds)" },
        { name: "Rates", description: "Rates (Cloudbeds)" },
        { name: "Rooms", description: "Rooms (Cloudbeds)" },
        { name: "Taxes", description: "Taxes and Fees (Cloudbeds)" },
        { name: "Items", description: "Items (Cloudbeds)" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
        schemas: {
          ErrorResponse: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
          ValidationErrorResponse: {
            type: "object",
            properties: {
              errors: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    msg: { type: "string" },
                    path: { type: "string" },
                    location: { type: "string" },
                  },
                },
              },
            },
          },
          CreateAccountRequest: {
            type: "object",
            required: ["name", "email", "password", "password_confirmation"],
            properties: {
              name: { type: "string", example: "Juan Perez" },
              email: { type: "string", example: "juan@correo.com" },
              password: { type: "string", example: "password123" },
              password_confirmation: { type: "string", example: "password123" },
            },
          },
          LoginRequest: {
            type: "object",
            required: ["email", "password"],
            properties: {
              email: { type: "string", example: "juan@correo.com" },
              password: { type: "string", example: "password123" },
            },
          },
          ChangePasswordRequest: {
            type: "object",
            required: ["current_password", "new_password", "new_password_confirmation"],
            properties: {
              current_password: { type: "string", example: "password123" },
              new_password: { type: "string", example: "password1234" },
              new_password_confirmation: { type: "string", example: "password1234" },
            },
          },
          User: {
            type: "object",
            properties: {
              _id: { type: "string", example: "64a6c0f1f6a2c8e7e0c0a111" },
              name: { type: "string", example: "Juan Perez" },
              email: { type: "string", example: "juan@correo.com" },
              rol: {
                type: "string",
                enum: ["admin", "host", "kitchen-admin", "kitchen-host", "delivery", "chofer"],
                example: "host",
              },
            },
          },
          ExtraArea: {
            type: "object",
            required: ["nombre", "horarios", "stockArea"],
            properties: {
              nombre: { type: "string", example: "Spa" },
              horarios: { type: "array", items: { type: "string" }, example: ["09:00", "10:00"] },
              stockArea: { type: "number", example: 5 },
            },
          },
          ExtraFechaBloqueada: {
            type: "object",
            required: ["inicio"],
            properties: {
              inicio: { type: "string", format: "date-time" },
              fin: { type: "string", format: "date-time", nullable: true },
            },
          },
          Extra: {
            type: "object",
            required: ["nombre", "precio", "descripcion", "duracion"],
            properties: {
              _id: { type: "string", example: "64a6c0f1f6a2c8e7e0c0a222" },
              nombre: { type: "string", example: "Masaje" },
              precio: { type: "number", example: 120 },
              descripcion: { type: "string", example: "Masaje relajante" },
              grupo: { type: "string", nullable: true, example: "Wellness" },
              minPersonas: { type: "number", nullable: true, example: 1 },
              personas: { type: "number", nullable: true, example: 2 },
              montoAdicional: { type: "number", nullable: true, example: 30 },
              stock: { type: "number", nullable: true, example: 10 },
              imagenes: { type: "array", items: { type: "string" }, example: [] },
              diasNoDisponibles: { type: "array", items: { type: "string" }, nullable: true, example: [] },
              fechasBloqueadas: {
                type: "array",
                nullable: true,
                items: { $ref: "#/components/schemas/ExtraFechaBloqueada" },
              },
              duracion: { type: "number", example: 60, description: "Duración en minutos" },
              areas: { type: "array", nullable: true, items: { $ref: "#/components/schemas/ExtraArea" } },
            },
          },
          CreateExtraRequest: {
            allOf: [{ $ref: "#/components/schemas/Extra" }],
          },
        },
      },
    },
    apis,
  });
};

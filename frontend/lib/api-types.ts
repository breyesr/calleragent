export interface components {
  schemas: {
    ClientCreate: {
      name: string;
      phone: string;
    };
    ClientUpdate: {
      name?: string;
      phone?: string;
    };
    ClientOut: {
      id: number;
      name: string;
      phone: string;
    };
    AppointmentCreate: {
      client_id: number;
      starts_at: string;
      ends_at: string;
      notes?: string | null;
    };
    AppointmentUpdate: {
      client_id?: number;
      starts_at?: string;
      ends_at?: string;
      notes?: string | null;
    };
    AppointmentOut: {
      id: number;
      client_id: number;
      starts_at: string;
      ends_at: string;
      notes?: string | null;
    };
    Message: {
      detail: string;
    };
  };
}

export interface paths {
  "/v1/clients": {
    get: {
      parameters: {
        query?: {
          q?: string;
        };
      };
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["ClientOut"][];
          };
        };
        default: {
          content: {
            "application/json": components["schemas"]["Message"];
          };
        };
      };
    };
    post: {
      requestBody: {
        content: {
          "application/json": components["schemas"]["ClientCreate"];
        };
      };
      responses: {
        201: {
          content: {
            "application/json": components["schemas"]["ClientOut"];
          };
        };
        default: {
          content: {
            "application/json": components["schemas"]["Message"];
          };
        };
      };
    };
  };
  "/v1/clients/{client_id}": {
    get: {
      parameters: {
        path: {
          client_id: number;
        };
      };
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["ClientOut"];
          };
        };
        default: {
          content: {
            "application/json": components["schemas"]["Message"];
          };
        };
      };
    };
    patch: {
      parameters: {
        path: {
          client_id: number;
        };
      };
      requestBody: {
        content: {
          "application/json": components["schemas"]["ClientUpdate"];
        };
      };
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["ClientOut"];
          };
        };
        default: {
          content: {
            "application/json": components["schemas"]["Message"];
          };
        };
      };
    };
  };
  "/v1/appointments": {
    get: {
      parameters: {
        query?: {
          date_from?: string;
          date_to?: string;
        };
      };
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["AppointmentOut"][];
          };
        };
        default: {
          content: {
            "application/json": components["schemas"]["Message"];
          };
        };
      };
    };
    post: {
      requestBody: {
        content: {
          "application/json": components["schemas"]["AppointmentCreate"];
        };
      };
      responses: {
        201: {
          content: {
            "application/json": components["schemas"]["AppointmentOut"];
          };
        };
        default: {
          content: {
            "application/json": components["schemas"]["Message"];
          };
        };
      };
    };
  };
  "/v1/appointments/{appointment_id}": {
    patch: {
      parameters: {
        path: {
          appointment_id: number;
        };
      };
      requestBody: {
        content: {
          "application/json": components["schemas"]["AppointmentUpdate"];
        };
      };
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["AppointmentOut"];
          };
        };
        default: {
          content: {
            "application/json": components["schemas"]["Message"];
          };
        };
      };
    };
    delete: {
      parameters: {
        path: {
          appointment_id: number;
        };
      };
      responses: {
        204: {
          description: string;
        };
        default: {
          content: {
            "application/json": components["schemas"]["Message"];
          };
        };
      };
    };
  };
}

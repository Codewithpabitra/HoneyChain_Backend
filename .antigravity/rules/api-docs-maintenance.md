# API Documentation Maintenance Rule

## Priority: Mandatory

Whenever you add, modify, or remove any API route, endpoint, controller method, request payload schema, query parameter, or response structure in the HoneyChain backend (`backend/src/routes/` or `backend/src/controllers/`):

1. **Synchronize `docs/api.md` immediately**:
   - Update the Route Map table if routes were added or removed.
   - Update the path, HTTP method, parameters, headers, and request body schema.
   - Update example JSON request and response payloads.
   - Document any new HTTP error codes and conditions.

2. **Never leave API documentation out of sync**:
   - Any PR or commit that alters API behavior must include the corresponding documentation update in `docs/api.md`.

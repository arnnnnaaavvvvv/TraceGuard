# Compatibility & Runtime Rules Catalog

TraceGuard enforces 7 Runtime Contract Rules and 10 Specification Compatibility Diff Rules.

---

## 1. Directional Request vs Response Compatibility Principles

API compatibility is fundamentally asymmetric:

```
               Existing Client Application (Fixed / Deployed)
                     │                             ▲
      Sends Request  │                             │  Receives Response
                     ▼                             │
               New API Service Deployment (Updated Contract)
```

### Request-Side Compatibility (Client $\rightarrow$ Server)
- **Adding REQUIRED parameters is BREAKING:** Old clients do not know this parameter exists; the server will reject them with `400 Bad Request`.
- **Adding OPTIONAL parameters is NON_BREAKING:** Old clients do not send it; server defaults apply.
- **Removing required parameters is NON_BREAKING:** Old clients continue sending it; the server accepts or ignores it.
- **Narrowing accepted enum values is BREAKING:** Values old clients send are now rejected.
- **Expanding accepted enum values is NON_BREAKING:** Server accepts a wider domain; old clients remain valid.

### Response-Side Compatibility (Server $\rightarrow$ Client)
- **Adding response properties is NON_BREAKING:** Standard JSON parsers ignore unrecognized fields.
- **Removing response properties is BREAKING:** Client code accessing `data.property` encounters `undefined` or runtime null reference errors.
- **Altering response property data types is BREAKING:** Deserializers fail or client code crashes when invoking type-specific methods.
- **Expanding response enum values is BREAKING:** Clients with exhaustive `switch` statements or enum validators will fail.

---

## 2. Complete Rule Catalog

### Runtime Rules
- **`TG-CONTRACT-STATUS-MISMATCH`**
  - *Trigger:* Observed HTTP status code is not declared in OpenAPI `responses` object for this operation.
  - *Severity:* `critical` | *Compat:* `BREAKING`
  - *Limits:* Does not inspect internal stack traces inside HTTP 500 responses.
- **`TG-CONTRACT-TYPE-MISMATCH`**
  - *Trigger:* Response property type does not match contract schema type.
  - *Severity:* `critical` | *Compat:* `BREAKING`
- **`TG-CONTRACT-REQUIRED-MISSING`**
  - *Trigger:* Property declared in `required` array of response schema is missing from body.
  - *Severity:* `critical` | *Compat:* `BREAKING`
- **`TG-CONTRACT-CONTENT-TYPE-MISMATCH`**
  - *Trigger:* Observed `Content-Type` does not match any documented media type for the operation.
  - *Severity:* `major` | *Compat:* `POTENTIALLY_BREAKING`
- **`TG-CONTRACT-HEADER-MISSING`**
  - *Trigger:* Response header declared with `required: true` is not present in response.
  - *Severity:* `major` | *Compat:* `BREAKING`
- **`TG-CONTRACT-INVALID-JSON`**
  - *Trigger:* Response `Content-Type` is JSON, but body contains malformed syntax.
  - *Severity:* `critical` | *Compat:* `BREAKING`
- **`TG-CONTRACT-ENUM-MISMATCH`**
  - *Trigger:* Response value is not contained in declared schema `enum` array.
  - *Severity:* `major` | *Compat:* `BREAKING`

### Compatibility Diff Rules
- **`TG-COMPAT-ENDPOINT-REMOVED`**
  - *Trigger:* Entire path template removed from revised spec.
  - *Severity:* `critical` | *Compat:* `BREAKING`
- **`TG-COMPAT-METHOD-REMOVED`**
  - *Trigger:* Supported HTTP method under path template removed.
  - *Severity:* `critical` | *Compat:* `BREAKING`
- **`TG-COMPAT-STATUS-REMOVED`**
  - *Trigger:* Documented status code removed from operation responses.
  - *Severity:* `major` | *Compat:* `BREAKING`
- **`TG-COMPAT-REQUIRED-REQUEST-FIELD-ADDED`**
  - *Trigger:* New required parameter or request body property added.
  - *Severity:* `critical` | *Compat:* `BREAKING`
- **`TG-COMPAT-REQUIRED-RESPONSE-FIELD-REMOVED`**
  - *Trigger:* Property removed from response `required` array.
  - *Severity:* `critical` | *Compat:* `BREAKING`
- **`TG-COMPAT-RESPONSE-TYPE-CHANGED`**
  - *Trigger:* Response property type altered incompatibly.
  - *Severity:* `critical` | *Compat:* `BREAKING`
- **`TG-COMPAT-ENUM-NARROWED`**
  - *Trigger:* Request enum narrowed, or response enum widened.
  - *Severity:* `major` | *Compat:* `BREAKING`
- **`TG-COMPAT-NULLABLE-CHANGED`**
  - *Trigger:* Property changed from nullable to non-nullable.
  - *Severity:* `major` | *Compat:* `POTENTIALLY_BREAKING`
- **`TG-COMPAT-AUTH-CHANGED`**
  - *Trigger:* Security requirement added or tightened.
  - *Severity:* `critical` | *Compat:* `BREAKING`
- **`TG-COMPAT-MEDIA-TYPE-REMOVED`**
  - *Trigger:* Accepted request or response media type removed.
  - *Severity:* `major` | *Compat:* `BREAKING`
- **`TG-COMPAT-POLYMORPHIC-CHANGED`**
  - *Trigger:* Polymorphic schema (`allOf`, `oneOf`, `anyOf`, `not`) altered.
  - *Severity:* `major` | *Compat:* `UNKNOWN`

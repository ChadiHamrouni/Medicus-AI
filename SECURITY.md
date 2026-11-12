# Security policy

Medicus handles protected health information. We take reports seriously and
fix confirmed issues as a priority.

## Reporting a vulnerability

**Please do not open a public issue, discussion or pull request for a
vulnerability.**

Report it privately through GitHub: open the repository's **Security** tab and
choose **Report a vulnerability**. Include:

- what is affected (service, endpoint, tool or screen) and the version or commit;
- steps to reproduce, or a proof of concept against your own local stack;
- the impact you see, for example reading another patient's record.

You will get an acknowledgement within 7 days and updates as the fix
progresses. Once a fix is released, we will credit you in the advisory unless
you prefer otherwise.

## Scope

In scope: the code in this repository: the backend services, `MedicusCommon`,
the gateway configuration, the database migrations and the mobile app.
Especially relevant:

- access to another user's records, conversations, documents or media;
- making an assistant tool act for a different patient or doctor;
- bypassing authentication, token revocation, rate limits or signed URLs;
- reaching internal service APIs from outside the gateway.

Out of scope: deployments run by third parties, issues that need a compromised
server or device, and the behaviour of the language model you configured, as
long as no data crosses a user boundary.

## Testing rules

Test only against a stack you run yourself, with the demo data
(`docker compose --profile demo run --rm seed-demo`). Never test against
someone else's deployment or use real patient data.

## Supported versions

Security fixes go to the latest version on `main`.

# Everyone signs in with a phone number and a WhatsApp code

Staff and customers both sign in through Auth0's passwordless phone login, so there is only one way to sign in. Auth0 creates the code and hands it to an Auth0 Action, which asks our backend to send it over WhatsApp from one shared TurfTap number. We chose WhatsApp over SMS because customers already use it and SMS costs more. A user is one phone number for the whole platform: the same person can be staff at one tenant and a customer at another.

## Consequences

- Auth0 stays behind our `AuthProvider` interface; the backend only checks tokens and reads the phone number.
- If WhatsApp is down, nobody can sign in until an SMS backup is added.

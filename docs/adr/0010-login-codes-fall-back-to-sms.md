# Login codes go by WhatsApp first, then SMS

A Login Code is sent by WhatsApp. If the user asks for another code within 10 minutes, the next one goes by SMS. This covers people without WhatsApp and times when WhatsApp is down, while most codes still go by the cheaper channel.

Auth0 makes the code and hands it to our API through the `/hooks/auth0/send-code` hook, but it can't tell us which channel the user wants: its phone step only knows "text" or "voice". So the API decides from what it has already sent. It records every send in `login_code_sends`, and a send within the last 10 minutes means the next code goes by SMS. We kept Auth0 rather than making and checking codes ourselves, so Auth0 still owns code expiry, wrong-attempt limits and tokens.

Each channel sits behind its own port: `MessagingChannel` for WhatsApp and `SmsChannel` for SMS. The platform service maps a channel name to its port, so adding a channel (voice, email) is one new port and one line in that map.

## Consequences

- On Auth0's code screen, the resend link is relabelled "Didn't get it? Send by SMS" (Auth0 custom text for the passwordless SMS prompt).
- Someone who starts sign-in again within 10 minutes also gets the code by SMS. That is usually the person whose WhatsApp code didn't arrive.
- If WhatsApp fails, the send is already recorded, so Auth0's retry goes by SMS.
- SMS costs more per message. Auth0's own rate limits on code requests are the only guard against someone requesting many codes; we add our own limit if that turns out to be a problem.
- The SMS vendor is not chosen yet. Only the `fake` adapter exists.

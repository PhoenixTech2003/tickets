# Tickets

Ask any questions for any implementations  that are not clear before starting any implementation

## Spec

### Functionality

- Should be able to create, update, disable and delete an event an event
- Should be able to create, update, delete, disable entrances of the venue to the event or an event should not have an entrance is also an  option
- Should be able to create, add, delete and disable ticket scanners, scanners will be users in the database you just search them by name or email when adding them, scanners can be tied to an entrance or no entrance at all
- should be able to generate tickets that can fit on two columns of an A4 pdf, the tickes should have basic details of the event and a six digit code which is a mixture of numbers and letters, tickets can be tied to an entrance or no entrace at all
- Tickets will be verified at the entrances when a person goes to the wrong entrance give out a message that the ticket belongs to entrance with a name and redirect the person to that entrance
- should be able to invite event organizers by searching up people by email in the platform according to everyone who has signed up and full crud to invite, and revoke
- RBAC enabled:
  - Admins have full control of every functionality
  - event organizers can see the events they create and have been invited to and can add ticket scanners to the event
  - ticket scanner only have a view of  the ticket scanning page where the enter the 6 digit code containing a mix of letters and numbers

## Stack

Below are some documentation to be aware of:

### Powersync

- [https://docs.powersync.com/integrations/neon](https://docs.powersync.com/integrations/neon)
- [https://docs.powersync.com/intro/powersync-overview](https://docs.powersync.com/intro/powersync-overview)
- [https://docs.powersync.com/client-sdks/orms/js/drizzle](https://docs.powersync.com/client-sdks/orms/js/drizzle)

### neon + managed better auth

- [https://neon.com/docs/auth/overview](https://neon.com/docs/auth/overview)
- [https://neon.com/docs/auth/guides/plugins/admin](https://neon.com/docs/auth/guides/plugins/admin)
- use oauth with google only as a sign in provider

### Drizzle orm

- [https://orm.drizzle.team/](https://orm.drizzle.team/)

### Nextjs 16

- [https://nextjs.org/](https://nextjs.org/) with cache components without compromising the realtime  from powersync select where it makes sense

### Environment variable setup

Once you are done with the full project tell which environment variables I need to set for the project and where exactly they need to go 

## Codebase organization

Use best practices for the  for react and data organization consider having a server folder that handles anyhting server side including the powersync stuff and handling  anything database including drizzle migrations

## Documentation

Document every stage of your implementation in a  /docs folder for anything you deem documentable 
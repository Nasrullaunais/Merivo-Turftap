# Every outside service sits behind our own interface

Sign-in (Auth0), file storage (SeaweedFS over the S3 protocol), WhatsApp, the AI assistant engine, payment providers and AI receipt reading are each used through an interface we own (a "port"), with one implementation per vendor (an "adapter"). Only adapter code may import a vendor's library, and an architecture test enforces this. Which adapter runs is chosen in one wiring file from environment settings, so swapping a vendor never touches business code.

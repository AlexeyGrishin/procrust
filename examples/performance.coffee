{Tail, Match, When, Having, functionMatch} = pm = require('./../pattern-matching')

measure = (repeats, fn) ->
  t1 = new Date().getTime()
  for i in [0..repeats]
    fn()
  t2 = new Date().getTime()
  t2 - t1

coffeeDestruct = (demo) ->
  {user} = demo
  return if not user.enabled
  {firstname, group, mailbox, settings} = user
  return if group.id != "admin"
  notifications = settings?.mail?.notify ? []
  return if mailbox?.kind != 'personal'
  mailboxId = mailbox?.id ? null
  {unreadmails, readmails} = mailbox;
  return if unreadmails.length < 1
  firstUnread = unreadmails?[0] ? []
  restUnread = unreadmails?.slice(1) ? []
  return if readmails?.length < 1
  return if readmails?[0]?.subject != "Hello"
  rest = readmails?.slice(1)
  return {firstname, notifications, firstUnread, restUnread, rest, mailboxId}



singlePattern = Match -> [
  When {user: {
    firstname: @firstname,
    enabled: true,
    group: {id: "admin"},
    settings: {mail: {notify: @notifications}},
    mailbox: {
      id: @mailboxId,
      kind: "personal",
      unreadmails: [
        @firstUnread | @restUnread
      ],
      readmails: [
        {subject: "Hello"}, Tail(@rest)
      ]
    }
  }}, -> "ok"
]

severalPatterns = Match -> [
  When {user: {
    firstname: @firstname,
    enabled: true,
    group: {id: "admin"},
    settings: {mail: {notify: @notifications}},
    mailbox: {
      id: @mailboxId,
      kind: "personal",
      unreadmails: [
        @firstUnread | @restUnread
      ],
      readmails: [@readMail1, @readMail2]
    }
  }}, -> throw "fail_read"
  When {user: {
    firstname: @firstname,
    enabled: true,
    group: {id: "admin"},
    settings: {mail: {notify: @notifications}},
    mailbox: {
      id: @mailboxId,
      kind: "personal",
      unreadmails: [],
      readmails: [
        {subject: "Hello"}, Tail(@rest)
      ]
    }
  }}, -> throw "fail_unread"
  When {user: {
    firstname: @firstname,
    enabled: true,
    group: {id: "regular"},
    settings: {mail: {notify: @notifications}},
    mailbox: {
      id: @mailboxId,
      kind: "personal",
      unreadmails: [
        @firstUnread | @restUnread
      ],
      readmails: [
        {subject: "Hello"}, Tail(@rest)
      ]
    }
  }}, -> throw "fail_group"
  When {user: {
    firstname: @firstname,
    enabled: false,
    group: {id: "admin"},
    settings: {mail: {notify: @notifications}},
    mailbox: {
      id: @mailboxId,
      kind: "personal",
      unreadmails: [
        @firstUnread | @restUnread
      ],
      readmails: [
        {subject: "Hello"}, Tail(@rest)
      ]
    }
  }}, -> throw "fail_enabled"
  When {user: {
    firstname: @firstname,
    enabled: true,
    group: {id: "admin"},
    settings: {mail: {notify: @notifications}},
    mailbox: {
      id: @mailboxId,
      kind: "personal",
      unreadmails: [
        @firstUnread | @restUnread
      ],
      readmails: [
        {subject: "Hello"}, Tail(@rest)
      ]
    }
  }}, -> "ok"
]

demoStruct = require('./demo.json')

console.log "Measure regular destruct..."
rd = measure(100000, ->coffeeDestruct(demoStruct))
console.log "Measure single pattern match..."
sp = measure(100000, ->singlePattern(demoStruct))
console.log "Measure several pattern matches..."
mp = measure(100000, ->severalPatterns(demoStruct))

console.log();
console.log("Regular:             #{rd}ms")
console.log("Single Pattern:      #{sp}ms")
console.log("Multiple patterns:   #{mp}ms")

console.log();
if sp > rd and mp > rd
  console.log("Worse in #{sp/rd|0} - #{mp/rd|0} times")



{Tail, Match, When, Having} = pm = require('./../procrust')

pm.debug.functions = true
pm.debug.parsed = true

measure = (repeats, fn) ->
  t1 = new Date().getTime()
  for i in [0..repeats]
    fn()
  t2 = new Date().getTime()
  t2 - t1

coffeeDestruct = (demo) ->
  {user} = demo
  return if not user?.enabled
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
  if firstname? and notifications? and firstUnread? and restUnread? and rest? and mailboxId?
    return {firstname, notifications, firstUnread, restUnread, rest, mailboxId}
  return false



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

test = `function anonymous(val,when,guard) {
    var res, val, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19;
    //if (!(val.length === 1)) return false;
    //$1 = val;
    if (!(($1 = val) !== undefined)) return false;
    //$2 = $1.user;
    if (!(($2 = $1.user) !== undefined)) return false;
    $3 = $2.enabled;

    //if (!(($1 = val) != null)) return false;
    //if (!(($2 = $1.user) != null)) return false;
    //if (!(($3 = $2.enabled) != null)) return false;
    if (!($3 === true)) return false;
    /*if (!(($4 = $2.firstname) != null)) return false;
    if (!(($5 = $2.group) != null)) return false;
    if (!(($6 = $5.id) != null)) return false;
    if (!($6 === "admin")) return false;
    /*if (!(($7 = $2.mailbox) != null)) return false;
    if (!(($8 = $7.id) != null)) return false;
    if (!(($9 = $7.kind) != null)) return false;
    if (!($9 === "personal")) return false;
    if (!(($10 = $7.readmails) != null)) return false;
    if (!(Array.isArray($10) && $10.length >= 1)) return false;
    if (!(($11 = $10[0]) != null)) return false;
    if (!(($12 = $11.subject) != null)) return false;
    if (!($12 === "Hello")) return false;
    $13 = Array.prototype.slice.call($10, 1)
    if (!(($14 = $7.unreadmails) != null)) return false;
    if (!(Array.isArray($14) && $14.length >= 1)) return false;
    if (!(($15 = $14[0]) != null)) return false;
    $16 = Array.prototype.slice.call($14, 1)
    if (!(($17 = $2.settings) != null)) return false;
    if (!(($18 = $17.mail) != null)) return false;
    if (!(($19 = $18.notify) != null)) return false;          */
    //res = {'firstname': $4, 'mailboxId': $8, 'rest': $13, 'firstUnread': $15, 'restUnread': $16, 'notifications': $19};
    //if (guard[0] && guard[0](res)) return {ok: when[0](res)};
    return res;
}
`
singlePatternCompiled = `function(json) {
    return test(json);
    //if (test
    //    ([json], function() { return true;}, function() {return "ok"}) === false) throw "error"
}
`


demoStruct = require('./demo.json')

sp = mp = 0
console.log "Measure regular destruct..."
rd = measure(100000, ->coffeeDestruct(demoStruct))
console.log "Measure single pattern match..."
sp = measure(100000, ->singlePattern(demoStruct))
console.log "Measure single pattern (compiled) match..."
sc = measure(100000, ->singlePatternCompiled(demoStruct))
console.log "Measure several pattern matches..."
mp = measure(100000, ->severalPatterns(demoStruct))

console.log();
console.log("Regular:             #{rd}ms")
console.log("Single Pattern:      #{sp}ms")
console.log("Single Pattern Cpld: #{sc}ms")
console.log("Multiple patterns:   #{mp}ms")

console.log();
#if sp > rd and mp > rd
#  console.log("Worse in #{sp/rd|0} - #{mp/rd|0} times")



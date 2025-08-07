NIP-100: WebRTC over Nostr
==========================

`draft` `optional` `author:jacany`

This NIP defines how to do WebRTC communication over Nostr.

## Abstract

This specification describes a method for establishing WebRTC peer-to-peer connections using Nostr events as the signaling layer. It enables real-time audio, video, and data communication directly between Nostr clients without requiring centralized signaling servers.

## Motivation

WebRTC provides excellent peer-to-peer communication capabilities but requires a signaling mechanism to coordinate connection establishment. By using Nostr as the signaling layer, we can create decentralized voice/video communication that aligns with Nostr's censorship-resistant principles.

## Specification

### Event Kind

WebRTC signaling events use kind `25050`.

### Defining Rooms

Rooms are the logical spaces where WebRTC communication occurs. Room definitions depend on the communication type:

1. **One-on-one calls**: Use only the `p` tag to specify the target participant
2. **Group calls**: Use both `p` tags for participants and an `r` tag for the room identifier

### Event Types

All WebRTC signaling events include a `type` tag to indicate the signaling message type.

#### Connect Event

Announces that a client is ready to connect to others in a room.

```json
{
    "kind": 25050,
    "pubkey": "<sender pubkey>",
    "tags": [
        ["type", "connect"],
        ["r", "<room id>"]
    ],
    "content": "Joining room: <room name>"
}
```

For one-on-one calls:
```json
{
    "kind": 25050,
    "pubkey": "<sender pubkey>",
    "tags": [
        ["type", "connect"],
        ["p", "<target pubkey>"]
    ],
    "content": ""
}
```

#### Disconnect Event

Announces that a client is leaving a room or call.

```json
{
    "kind": 25050,
    "pubkey": "<sender pubkey>",
    "tags": [
        ["type", "disconnect"],
        ["r", "<room id>"]
    ],
    "content": "Leaving room: <room name>"
}
```

#### Offer Event

Contains WebRTC offer data for connection establishment.

```json
{
    "kind": 25050,
    "pubkey": "<sender pubkey>",
    "tags": [
        ["type", "offer"],
        ["p", "<receiver pubkey>"],
        ["r", "<optional encrypted room id>"]
    ],
    "content": "<encrypted JSON>"
}
```

Encrypted content structure:
```json
{
    "offer": "<SDP offer string>",
    "type": "offer"
}
```

#### Answer Event

Contains WebRTC answer data in response to an offer.

```json
{
    "kind": 25050,
    "pubkey": "<sender pubkey>",
    "tags": [
        ["type", "answer"],
        ["p", "<receiver pubkey>"],
        ["r", "<optional encrypted room id>"]
    ],
    "content": "<encrypted JSON>"
}
```

Encrypted content structure:
```json
{
    "sdp": "<SDP answer string>",
    "type": "answer"
}
```

#### ICE Candidate Event

Contains ICE candidate data for connection establishment.

```json
{
    "kind": 25050,
    "pubkey": "<sender pubkey>",
    "tags": [
        ["type", "candidate"],
        ["p", "<receiver pubkey>"],
        ["r", "<optional encrypted room id>"]
    ],
    "content": "<encrypted JSON>"
}
```

Encrypted content structure:
```json
{
    "candidate": "<ICE candidate string>",
    "sdpMid": "<SDP media ID>",
    "sdpMLineIndex": <line index number>
}
```

### Encryption

The `content` field of `offer`, `answer`, and `candidate` events MUST be encrypted using NIP-04 encryption between the sender and receiver. Room IDs in `r` tags MAY be encrypted for private rooms.

**Important**: Content fields MUST be JSON stringified before encryption.

### Connection Establishment Flow

1. **Room Discovery**: Clients monitor for `connect` events with matching `r` tags
2. **Offer Initiation**: When a new participant joins, existing participants decide who initiates the WebRTC offer (typically the participant with the lexicographically smaller pubkey)
3. **Signaling Exchange**: Offer, answer, and ICE candidate events are exchanged between participants
4. **Connection Established**: WebRTC peer connection is established for media/data exchange

### Moderation Events

#### Kick Event

Temporarily removes a user from a room.

```json
{
    "kind": 25050,
    "pubkey": "<moderator pubkey>",
    "tags": [
        ["type", "kick"],
        ["p", "<target pubkey>"],
        ["r", "<room id>"]
    ],
    "content": "<reason for kick>"
}
```

#### Ban Event

Permanently removes a user from a room.

```json
{
    "kind": 25050,
    "pubkey": "<moderator pubkey>",
    "tags": [
        ["type", "ban"],
        ["p", "<target pubkey>"],
        ["r", "<room id>"]
    ],
    "content": "<reason for ban>"
}
```

### Client Behavior

#### Event Listening

Clients MUST listen for:
- Events with `p` tags containing their pubkey (directed events)
- Events with `r` tags for rooms they're interested in (room events)

#### Connection Coordination

To avoid connection race conditions:
- When two clients detect each other joining a room, the client with the lexicographically smaller pubkey SHOULD initiate the WebRTC offer
- Clients SHOULD implement connection timeouts and retry logic

#### Privacy Considerations

- Room IDs in `r` tags MAY be left unencrypted for public rooms
- Private rooms SHOULD encrypt room IDs to prevent unauthorized discovery
- All offer/answer/candidate content MUST be encrypted between participants

## Implementation Notes

### WebRTC Configuration

Clients SHOULD use public STUN servers and MAY implement TURN server support for NAT traversal.

### Media Handling

- Audio SHOULD be enabled by default for voice communication
- Video MAY be optionally enabled
- Clients SHOULD implement audio level detection for speaking indicators

### Scalability

For large group calls, clients MAY implement:
- Selective forwarding unit (SFU) architecture
- Connection limits to prevent excessive peer connections
- Audio-only mode for better performance

## Security Considerations

- All sensitive signaling data MUST be encrypted using NIP-04
- Clients SHOULD validate WebRTC offer/answer data before processing
- Moderation capabilities SHOULD be restricted to designated moderators
- Clients SHOULD implement rate limiting for signaling events

## Examples

See the reference implementation in Peachy HODL's audio room system for practical usage examples.
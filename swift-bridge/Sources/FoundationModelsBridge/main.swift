import Foundation
import FoundationModels

struct Request: Decodable {
    let id: Int
    let command: String
    let payload: Payload?
}

struct Payload: Decodable {
    let systemPrompt: String?
    let userPrompt: String?
}

struct OutboundMessage: Encodable {
    let type: String
    let id: Int?
    let payload: EncodableValue?
    let error: ErrorPayload?
}

struct ErrorPayload: Encodable {
    let message: String
}

struct EncodableValue: Encodable {
    private let encodeImpl: (Encoder) throws -> Void

    init<T: Encodable>(_ value: T) {
        self.encodeImpl = value.encode
    }

    func encode(to encoder: Encoder) throws {
        try encodeImpl(encoder)
    }
}

struct AvailabilityPayload: Encodable {
    let status: String
    let reason: String?
}

struct ResponsePayload: Encodable {
    let text: String
}

struct EventPayload: Encodable {
    let kind: String
    let text: String
}

actor SessionController {
    private var activeTask: Task<Void, Never>?

    func cancel() {
        activeTask?.cancel()
        activeTask = nil
    }

    func setTask(_ task: Task<Void, Never>) {
        activeTask = task
    }
}

@main
struct FoundationModelsBridgeApp {
    static func main() async {
        let encoder = JSONEncoder()
        let controller = SessionController()

        writeLine(OutboundMessage(type: "ready", id: nil, payload: nil, error: nil), encoder: encoder)

        while let line = readLine() {
            guard !line.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                continue
            }

            do {
                let request = try JSONDecoder().decode(Request.self, from: Data(line.utf8))
                try await handle(request: request, controller: controller, encoder: encoder)
            } catch {
                writeLine(
                    OutboundMessage(type: "error", id: nil, payload: nil, error: ErrorPayload(message: error.localizedDescription)),
                    encoder: encoder
                )
            }
        }
    }

    static func handle(request: Request, controller: SessionController, encoder: JSONEncoder) async throws {
        switch request.command {
        case "checkAvailability":
            let availability = SystemLanguageModel.default.availability
            let payload = AvailabilityPayload(status: String(describing: availability), reason: availabilityReason(availability))
            writeLine(OutboundMessage(type: "result", id: request.id, payload: EncodableValue(payload), error: nil), encoder: encoder)

        case "generate":
            guard let prompt = request.payload?.userPrompt, !prompt.isEmpty else {
                throw BridgeError.invalidPrompt
            }

            let instructions = request.payload?.systemPrompt?.isEmpty == false ? request.payload?.systemPrompt : nil
            let session = instructions.map { LanguageModelSession(instructions: $0) } ?? LanguageModelSession()
            var collectedText = ""

            let task = Task {
                do {
                    let stream = session.streamResponse(to: prompt)
                    for try await partial in stream {
                        if Task.isCancelled { return }
                        collectedText += partial.content
                        let event = EventPayload(kind: "token", text: partial.content)
                        writeLine(OutboundMessage(type: "event", id: request.id, payload: EncodableValue(event), error: nil), encoder: encoder)
                    }

                    let payload = ResponsePayload(text: collectedText)
                    writeLine(OutboundMessage(type: "result", id: request.id, payload: EncodableValue(payload), error: nil), encoder: encoder)
                } catch {
                    writeLine(OutboundMessage(type: "error", id: request.id, payload: nil, error: ErrorPayload(message: error.localizedDescription)), encoder: encoder)
                }
            }

            await controller.setTask(task)

        case "cancel":
            await controller.cancel()
            let payload = ResponsePayload(text: "cancelled")
            writeLine(OutboundMessage(type: "result", id: request.id, payload: EncodableValue(payload), error: nil), encoder: encoder)

        default:
            throw BridgeError.unknownCommand(request.command)
        }
    }

    static func writeLine(_ message: OutboundMessage, encoder: JSONEncoder) {
        guard let data = try? encoder.encode(message), let string = String(data: data, encoding: .utf8) else {
            fputs("{\"type\":\"error\",\"error\":{\"message\":\"Encoding failure\"}}\n", stderr)
            return
        }

        print(string)
        fflush(stdout)
    }

    static func availabilityReason(_ availability: SystemLanguageModel.Availability) -> String? {
        switch availability {
        case .available:
            return nil
        default:
            return String(describing: availability)
        }
    }
}

enum BridgeError: LocalizedError {
    case invalidPrompt
    case unknownCommand(String)

    var errorDescription: String? {
        switch self {
        case .invalidPrompt:
            return "userPrompt is required."
        case .unknownCommand(let command):
            return "Unknown command: \(command)"
        }
    }
}

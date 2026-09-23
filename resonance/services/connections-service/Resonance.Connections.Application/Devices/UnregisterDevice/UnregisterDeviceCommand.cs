using MediatR;

namespace Resonance.Connections.Application.Devices.UnregisterDevice;

public record UnregisterDeviceCommand(Guid UserId, string Token) : IRequest;

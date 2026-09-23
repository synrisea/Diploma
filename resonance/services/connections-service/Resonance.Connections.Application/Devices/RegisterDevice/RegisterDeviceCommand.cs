using MediatR;

namespace Resonance.Connections.Application.Devices.RegisterDevice;

public record RegisterDeviceCommand(Guid UserId, string Token, string Platform) : IRequest;

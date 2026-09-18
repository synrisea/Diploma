using MediatR;

namespace Resonance.Connections.Application.Blocks.CreateBlock;

public record CreateBlockCommand(Guid BlockerUserId, Guid BlockedUserId) : IRequest;

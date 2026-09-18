using MediatR;

namespace Resonance.Connections.Application.Blocks.DeleteBlock;

public record DeleteBlockCommand(Guid BlockerUserId, Guid BlockedUserId) : IRequest;

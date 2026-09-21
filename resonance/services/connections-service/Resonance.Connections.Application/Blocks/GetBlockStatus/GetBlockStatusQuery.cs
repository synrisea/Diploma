using MediatR;

namespace Resonance.Connections.Application.Blocks.GetBlockStatus;

public record BlockStatusDto(bool CanMessage, bool BlockedByMe);

public record GetBlockStatusQuery(Guid CallerId, Guid OtherUserId) : IRequest<BlockStatusDto>;

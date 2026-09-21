using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Connections.Application.Common;

namespace Resonance.Connections.Application.Blocks.GetBlockStatus;

public class GetBlockStatusHandler : IRequestHandler<GetBlockStatusQuery, BlockStatusDto>
{
    private readonly IApplicationDbContext _context;

    public GetBlockStatusHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>Reports whether the caller blocked the other person, but never whether the
    /// other person blocked the caller - that case is reported only as "cannot message",
    /// so being blocked is indistinguishable from any other reason messaging is closed.</summary>
    public async Task<BlockStatusDto> Handle(GetBlockStatusQuery request, CancellationToken cancellationToken)
    {
        var blockedByMe = await _context.Blocks.AnyAsync(
            b => b.BlockerUserId == request.CallerId && b.BlockedUserId == request.OtherUserId, cancellationToken);

        var blockedEitherWay = blockedByMe || await _context.Blocks.AnyAsync(
            b => b.BlockerUserId == request.OtherUserId && b.BlockedUserId == request.CallerId, cancellationToken);

        return new BlockStatusDto(!blockedEitherWay, blockedByMe);
    }
}

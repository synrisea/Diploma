using Microsoft.EntityFrameworkCore;

namespace Resonance.Connections.Application.Common;

public static class BlockChecks
{
    public static Task<bool> IsBlockedEitherWay(IApplicationDbContext context, Guid userA, Guid userB, CancellationToken cancellationToken)
    {
        return context.Blocks.AnyAsync(
            b => (b.BlockerUserId == userA && b.BlockedUserId == userB) || (b.BlockerUserId == userB && b.BlockedUserId == userA),
            cancellationToken);
    }
}

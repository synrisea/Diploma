using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Connections.Application.Common;

namespace Resonance.Connections.Application.Devices.UnregisterDevice;

public class UnregisterDeviceHandler : IRequestHandler<UnregisterDeviceCommand>
{
    private readonly IApplicationDbContext _context;

    public UnregisterDeviceHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(UnregisterDeviceCommand request, CancellationToken cancellationToken)
    {
        var token = request.Token.Trim();
        await _context.DeviceTokens
            .Where(t => t.UserId == request.UserId && t.Token == token)
            .ExecuteDeleteAsync(cancellationToken);
    }
}

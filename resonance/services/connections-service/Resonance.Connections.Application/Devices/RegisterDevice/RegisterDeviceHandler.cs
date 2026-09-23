using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Connections.Application.Common;
using Resonance.Connections.Domain.Entities;

namespace Resonance.Connections.Application.Devices.RegisterDevice;

public class RegisterDeviceHandler : IRequestHandler<RegisterDeviceCommand>
{
    private readonly IApplicationDbContext _context;

    public RegisterDeviceHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(RegisterDeviceCommand request, CancellationToken cancellationToken)
    {
        var token = request.Token.Trim();
        var existing = await _context.DeviceTokens
            .SingleOrDefaultAsync(t => t.Token == token, cancellationToken);

        if (existing is null)
            _context.DeviceTokens.Add(new DeviceToken(Guid.NewGuid(), request.UserId, token, request.Platform));
        else
            existing.ReassignTo(request.UserId, request.Platform);

        await _context.SaveChangesAsync(cancellationToken);
    }
}

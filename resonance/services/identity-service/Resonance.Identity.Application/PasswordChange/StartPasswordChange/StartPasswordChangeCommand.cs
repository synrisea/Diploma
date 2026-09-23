using MediatR;

namespace Resonance.Identity.Application.PasswordChange.StartPasswordChange;

public record StartPasswordChangeCommand(Guid UserId, string? CurrentPassword, string NewPassword) : IRequest;

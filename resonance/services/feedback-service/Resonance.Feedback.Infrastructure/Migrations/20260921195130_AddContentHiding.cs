using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Resonance.Feedback.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddContentHiding : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsHidden",
                table: "QuickFeedbacks",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsHidden",
                table: "QuickFeedbackPhotos",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsHidden",
                table: "QuickFeedbacks");

            migrationBuilder.DropColumn(
                name: "IsHidden",
                table: "QuickFeedbackPhotos");
        }
    }
}

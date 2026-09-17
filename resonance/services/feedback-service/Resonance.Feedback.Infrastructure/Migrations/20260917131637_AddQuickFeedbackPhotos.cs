using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Resonance.Feedback.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddQuickFeedbackPhotos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "QuickFeedbackPhotos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    QuickFeedbackId = table.Column<Guid>(type: "uuid", nullable: false),
                    Url = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuickFeedbackPhotos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QuickFeedbackPhotos_QuickFeedbacks_QuickFeedbackId",
                        column: x => x.QuickFeedbackId,
                        principalTable: "QuickFeedbacks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_QuickFeedbackPhotos_QuickFeedbackId",
                table: "QuickFeedbackPhotos",
                column: "QuickFeedbackId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "QuickFeedbackPhotos");
        }
    }
}
